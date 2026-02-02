const ChartRenderer = {
    svg: null,
    highlightGroup: null,
    currentExpanded: null,
    currentExpandedLocation: null,  // Track {categoryId, itemId, spokeIndex} for toggle
    branchClickOutsideHandler: null,  // Store reference to document click handler

    // Check if branch is expanded and collapse it, returns true if collapsed
    collapseIfBranchExpanded() {
        if (this.currentExpandedLocation) {
            this.collapseBranch();
            return true;
        }
        return false;
    },

    // Spoke type helper functions
    getSpokeVisualIndicator(spoke) {
        if (typeof spoke === 'string') return '';

        const type = spoke.type || 'static';
        const hasChildren = spoke.children && spoke.children.length > 0;

        // If it has children, show action indicator with count
        if (hasChildren) {
            return ` • (${spoke.children.length})`;
        }

        // Only show action indicator (repeating/pending hidden until complete)
        switch(type) {
            case 'action':
                return ' ✓';
            // HIDDEN UNTIL FEATURES COMPLETE:
            // case 'repeating':
            //     return ' 🔁';
            // case 'pending':
            //     return ' ⏸';
            case 'static':
            default:
                return '';
        }
    },

    getSpokeTextStyle(spoke) {
        if (typeof spoke === 'string') return {};

        const type = spoke.type || 'static';
        const hasChildren = spoke.children && spoke.children.length > 0;

        let style = {};

        // Actions with children are bold
        if (hasChildren) {
            style['font-weight'] = 'bold';
        }

        // HIDDEN UNTIL FEATURES COMPLETE:
        // Pending spokes are italic
        // if (type === 'pending') {
        //     style['font-style'] = 'italic';
        //     style['fill'] = '#999';
        // }

        return style;
    },

    handleSpokeClick(event, subItem, catData, sliceData, spokeIndex, categoryId, itemId) {
        event.stopPropagation();

        // Get spoke type
        const spokeType = DataModel.getSpokeType(categoryId, itemId, spokeIndex);
        const hasChildren = (typeof subItem === 'object' && subItem.children && subItem.children.length > 0);

        if (hasChildren) {
            // Check if this spoke is already expanded (toggle behavior)
            const loc = this.currentExpandedLocation;
            if (loc && loc.categoryId === categoryId && loc.itemId === itemId && loc.spokeIndex === spokeIndex) {
                // Same spoke clicked - collapse it
                this.collapseBranch();
                return;
            }

            // Show branch expansion for spokes with children
            const angle = sliceData.startAngle + ((sliceData.endAngle - sliceData.startAngle) / sliceData.data.subItems.length) * (spokeIndex + 0.5);
            ChartRenderer.expandBranch(subItem, catData, sliceData, angle, categoryId, itemId, spokeIndex);
        } else if (spokeType === 'action') {
            // Collapse any expanded branch first
            this.collapseIfBranchExpanded();
            // For action spokes without children, show calendar picker
            const spokeName = typeof subItem === 'string' ? subItem : subItem.text;
            UI.showDateTimePicker(
                spokeName,
                spokeName,
                sliceData.data.name,
                catData.data.name
            );
        } else {
            // Collapse any expanded branch first
            this.collapseIfBranchExpanded();
            // For static, repeating, or pending spokes, show configuration
            const spokeName = typeof subItem === 'string' ? subItem : subItem.text;
            UI.showSpokeConfig(
                categoryId,
                itemId,
                spokeIndex,
                spokeName,
                sliceData.data.name,
                catData.data.name
            );
        }
    },
    
    init(containerId) {
        const container = d3.select(`#${containerId}`);
        container.selectAll('*').remove();
        
        // Get container dimensions
        const containerNode = document.getElementById(containerId);
        const containerWidth = containerNode.clientWidth;
        const containerHeight = Math.max(containerNode.clientHeight, 600);
        
        // Calculate responsive dimensions
        const minDimension = Math.min(containerWidth, containerHeight);
        this.width = containerWidth;
        this.height = containerWidth > 1024 ? containerHeight : containerHeight / 1.3;
        this.outerRadius = Math.min(containerWidth <= 1024 ? 350 : 550, minDimension * 0.33);
        this.innerRadius = containerWidth <= 1024 ? this.outerRadius - 40 : this.outerRadius - 60;
        
        this.svg = container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g')
            .attr('transform', `translate(${this.width / 2}, ${(this.height / 2)})`);
        
        // Create a group for highlighted/expanded slices (drawn on top)
        this.highlightGroup = this.svg.append('g').attr('class', 'highlight-layer');
    },

    // Helper to determine if a color is dark
    isColorDark(hexColor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
    },

    render(categories) {
        if (!this.svg) this.init('chart-container');

        this.svg.selectAll('*').remove();
        this.highlightGroup = this.svg.append('g').attr('class', 'highlight-layer');

        const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

        if (totalItems === 0) {
            this.svg.append('text')
                .attr('text-anchor', 'middle')
                .attr('fill', '#999')
                .attr('font-size', '16px')
                .text('Add items to see your brain pie chart');
            return;
        }

        // Calculate category percentages - use overrides if available
        const categoryData = categories.map(cat => ({
            ...cat,
            percentage: DataModel.getCategoryPercentage(cat.id)
        })).filter(cat => cat.items.length > 0);

        // Outer ring (categories)
        const outerPie = d3.pie()
            .value(d => d.percentage)
            .sort(null);

        const outerArc = d3.arc()
            .innerRadius(this.innerRadius)
            .outerRadius(this.outerRadius);

        const outerData = outerPie(categoryData);


        // Draw outer category slices - WITH HOVER/CLICK EFFECT
        const categorySlices = this.svg.selectAll('.outer-slice')
            .data(outerData)
            .enter()
            .append('g')
            .attr('class', 'outer-slice')
            .style('cursor', 'pointer');

        categorySlices.append('path')
            .attr('d', outerArc)
            .attr('fill', d => d.data.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 3)
            .attr('opacity', 0.7);

        // Add click effect for categories
        categorySlices.on('click', (event, d) => {
            event.stopPropagation();
            // Collapse branch if one is expanded
            if (this.collapseIfBranchExpanded()) return;
            if (!this.currentExpanded) {
                this.expandCategory(d, outerData);
            }
        }).on('mouseleave', () => {
            if (!this.currentExpanded) {
                this.collapseSlice();
            }
        });

        // Category labels - CURVED TEXT ALONG THE ARC
        categorySlices.each((d, i, nodes) => {
            const group = d3.select(nodes[i]);
            const labelRadius = (this.innerRadius + this.outerRadius) / 2;

            const textColor = this.isColorDark(d.data.color) ? '#ffffff' : '#333333';

            // Determine if text should be flipped (for bottom half: from 3 o'clock to 9 o'clock)
            const midAngle = (d.startAngle + d.endAngle) / 2;
            const shouldFlip = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI / 2);

            // Create FULL arc path using the complete slice angles
            group.append('path')
                .attr('id', `category-text-arc-${i}`)
                .attr('d', () => {
                    return d3.arc()
                        .innerRadius(labelRadius)
                        .outerRadius(labelRadius)
                        .startAngle(shouldFlip ? d.endAngle : d.startAngle)
                        .endAngle(shouldFlip ? d.startAngle : d.endAngle)();
                })
                .style('fill', 'none');

            // Category name
            group.append('text')
                .attr('class', 'category-label')
                .style('fill', textColor)
                .append('textPath')
                .attr('xlink:href', `#category-text-arc-${i}`)
                .attr('startOffset', this.width > 1024 ? '20%' : '15%')
                .text(d.data.name);

            // Percentage path (offset)
            const percentRadius = labelRadius + (shouldFlip ? 22 : -22);

            group.append('path')
                .attr('id', `category-percent-arc-${i}`)
                .attr('d', () => {
                    return d3.arc()
                        .innerRadius(percentRadius)
                        .outerRadius(percentRadius)
                        .startAngle(shouldFlip ? d.endAngle : d.startAngle)
                        .endAngle(shouldFlip ? d.startAngle : d.endAngle)();
                })
                .style('fill', 'none');

            // Percentage
            group.append('text')
                .attr('class', 'category-percentage')
                .style('fill', textColor)
                .append('textPath')
                .attr('xlink:href', `#category-percent-arc-${i}`)
                .attr('startOffset', '20%')
                .attr('text-anchor', 'middle')
                .text(`${d.data.percentage.toFixed(1)}%`);
        });

        // Inner ring (items within categories) - WITH HOVER EXPANSION
        outerData.forEach((catData, catIndex) => {
            const category = catData.data;
            const items = category.items;

            if (items.length === 0) return;

            const categoryStartAngle = catData.startAngle;
            const categoryEndAngle = catData.endAngle;

            // Create pie for items within this category's angle range
            const itemPie = d3.pie()
                .value(d => d.percentage)
                .sort(null)
                .startAngle(categoryStartAngle)
                .endAngle(categoryEndAngle);

            const innerArc = d3.arc()
                .innerRadius(0)
                .outerRadius(this.innerRadius);

            const itemData = itemPie(items);

            // Draw item slices
            const itemSlices = this.svg.selectAll(`.inner-slice-${category.id}`)
                .data(itemData)
                .enter()
                .append('g')
                .attr('class', `inner-slice inner-slice-${category.id}`)
                .style('cursor', 'pointer');

            itemSlices.append('path')
                .attr('d', innerArc)
                .attr('fill', d => d.data.color)
                .attr('stroke', 'white')
                .attr('stroke-width', 2);

            // Add click expand effect
            itemSlices.on('click', (event, d) => {
                event.stopPropagation();
                // Collapse branch if one is expanded
                if (this.collapseIfBranchExpanded()) return;
                if (!this.currentExpanded) {
                    this.expandSlice(d, catData, category, itemData)
                }
            }).on('mouseleave', () => {
                if (!this.currentExpanded) {
                    this.collapseSlice();
                }
            });

            // Item labels - RADIAL TEXT along the wedge angle
            itemSlices.each((d, i, nodes) => {
                const group = d3.select(nodes[i]);
                const midAngle = (d.startAngle + d.endAngle) / 2;
                const labelRadius = this.innerRadius / 1.3;

                // Show labels for items with enough space
                if ((d.endAngle - d.startAngle) > 0.06) {
                    const x = Math.cos(midAngle - Math.PI / 2) * labelRadius;
                    const y = Math.sin(midAngle - Math.PI / 2) * labelRadius;

                    // Calculate rotation angle (in degrees) to make text radial
                    let rotation = (midAngle * 180 / Math.PI) - 90;

                    // Flip text if it would be upside down
                    if (rotation > 90 && rotation < 270) {
                        rotation += 180;
                    }

                    const textColor = this.isColorDark(d.data.color) ? '#ffffff' : '#333333';

                    group.append('text')
                        .attr('class', 'item-label')
                        .style('fill', textColor)
                        .attr('transform', `translate(${x}, ${y}) rotate(${rotation})`)
                        .attr('text-anchor', 'middle')
                        .text(d.data.name);
                }
            });

           // Draw sub-items - EXTENDING PAST OUTER RING with EXPONENTIAL SCALING
            itemSlices.each((d, i, nodes) => {
                const group = d3.select(nodes[i]);
                const subItems = d.data.subItems;
                
                if (subItems.length === 0) return;
                
                const startAngle = d.startAngle;
                const endAngle = d.endAngle;
                const angleStep = (endAngle - startAngle) / subItems.length;
                
                subItems.forEach((subItem, idx) => {
                    const angle = startAngle + (angleStep * (idx + 0.5));
                    const innerX = 0;
                    const innerY = 0;
                    
                    // Calculate the actual rendering angle
                    const renderAngle = angle - Math.PI / 2;
                    
                    // Calculate x,y to determine if we're near vertical axis
                    const testX = Math.cos(renderAngle);
                    const testY = Math.sin(renderAngle);
                    
                    // Distance from vertical axis (top/bottom): abs(x) should be small
                    const horizontalness = Math.abs(testX);
                    
                    // Exponential scaling: more vertical = longer extension
                    const scaleFactor = Math.pow(1 - horizontalness, 2);
                    const baseExtension = 15;
                    const maxExtension = 46;
                    const additionalExtension = scaleFactor * (maxExtension - baseExtension);
                    const totalExtension = baseExtension + additionalExtension;
                    
                    const extendX = Math.cos(renderAngle) * (this.outerRadius + totalExtension);
                    const extendY = Math.sin(renderAngle) * (this.outerRadius + totalExtension);
                    
                    // Draw single line from center to label position
                    group.append('line')
                        .attr('class', 'sub-item-line')
                        .attr('x1', innerX)
                        .attr('y1', innerY)
                        .attr('x2', extendX)
                        .attr('y2', extendY);
                    
                    // Calculate text rotation based on vertical position
                    const verticalness = Math.abs(testY);
                    const maxRotation = 30;
                    const rotationAmount = verticalness * maxRotation;
                    
                    // Rotate based on quadrant
                    let textRotation;
                    if (testX > 0) {
                        textRotation = testY < 0 ? -rotationAmount : rotationAmount;
                    } else {
                        textRotation = testY < 0 ? rotationAmount : -rotationAmount;
                    }
                    
                    // Position label slightly beyond line end
                    const labelOffset = 10;
                    const labelX = extendX + (Math.cos(renderAngle) * labelOffset);
                    const labelY = extendY + (Math.sin(renderAngle) * labelOffset);

                    // Add label with click handler using spoke type helpers
                    const spokeName = typeof subItem === 'string' ? subItem : subItem.text;
                    const indicator = ChartRenderer.getSpokeVisualIndicator(subItem);
                    const textStyle = ChartRenderer.getSpokeTextStyle(subItem);

                    const spokeLabel = group.append('text')
                        .attr('class', 'sub-item-label')
                        .attr('transform', `translate(${labelX}, ${labelY}) rotate(${textRotation})`)
                        .attr('text-anchor', extendX > 0 ? 'start' : 'end')
                        .style('cursor', 'pointer')
                        .text(spokeName + indicator)
                        .on('click', function(event) {
                            ChartRenderer.handleSpokeClick(
                                event,
                                subItem,
                                catData,
                                d,
                                idx,
                                catData.data.id,
                                d.data.id
                            );
                        });

                    // Apply text styling based on spoke type
                    Object.keys(textStyle).forEach(key => {
                        spokeLabel.style(key, textStyle[key]);
                    });

                });
            });
        });
    },

    expandSlice(sliceData, categoryData, category, allItemsInCategory) {
        this.currentExpanded = sliceData;
        const that = this;
        setTimeout(() => {
            // Clear any existing highlight
            that.highlightGroup.selectAll('*').remove();

            // Calculate expansion factor
            const angleSize = sliceData.endAngle - sliceData.startAngle;
            const anglePercentage = (angleSize / (2 * Math.PI)) * 100;

            let targetPercentage;
            if (anglePercentage < 30) {
                targetPercentage = 30;
            } else {
                targetPercentage = 60;
            }

            // Calculate scale factor
            const scaleFactor = targetPercentage / anglePercentage;
            const newAngleSize = angleSize * scaleFactor;

            // Center the expansion around the slice's midpoint
            const midAngle = (sliceData.startAngle + sliceData.endAngle) / 2;
            const newStartAngle = midAngle - (newAngleSize / 2);
            const newEndAngle = midAngle + (newAngleSize / 2);

            // Calculate translation: pull wedge INWARD (negative direction) by 30% of innerRadius
            const translateDistance = -that.innerRadius * 0.3;
            const translateX = Math.cos(midAngle - Math.PI / 2) * translateDistance;
            const translateY = Math.sin(midAngle - Math.PI / 2) * translateDistance;

            // Create expanded arc
            const expandedArc = d3.arc()
                .innerRadius(0)
                .outerRadius(that.innerRadius + 50)
                .startAngle(newStartAngle)
                .endAngle(newEndAngle);

            // Draw expanded slice
            const expandedGroup = that.highlightGroup.append('g')
                .attr('class', 'expanded-slice')
                .attr('transform', `translate(${translateX}, ${translateY})`);

            expandedGroup.append('path')
                .attr('d', expandedArc)
                .attr('fill', sliceData.data.color)
                .attr('stroke', 'white')
                .attr('stroke-width', 3)
                .attr('opacity', 0.95);


            that.highlightGroup.raise();

            this.highlightGroup.on('click', (event) => {
                that.collapseSlice();
            })

            // Hide base layer
            that.svg.selectAll('.sub-item-label, .sub-item-line, .inner-slice, .outer-slice')
                .transition().duration(100)
                .style('opacity', 0.03)

            // Add label
            const labelRadius = (that.innerRadius + 50) / 2;
            const x = Math.cos(midAngle - Math.PI / 2) * labelRadius;
            const y = Math.sin(midAngle - Math.PI / 2) * labelRadius;

            let rotation = (midAngle * 180 / Math.PI) - 90;
            if (rotation > 90 && rotation < 270) {
                rotation += 180;
            }

            const textColor = that.isColorDark(sliceData.data.color) ? '#ffffff' : '#333333';
            expandedGroup.append('text')
                .attr('class', 'item-label')
                .style('fill', textColor)
                .style('font-size', '16px')
                .style('font-weight', 'bold')
                .attr('transform', `translate(${x}, ${y}) rotate(${rotation})`)
                .attr('text-anchor', 'middle')
                .text(sliceData.data.name);

            // Draw sub-items in expanded view
            const subItems = sliceData.data.subItems;
            if (subItems.length > 0) {
                const angleStep = newAngleSize / subItems.length;

                subItems.forEach((subItem, idx) => {
                    const angle = newStartAngle + (angleStep * (idx + 0.5));
                    const extendX = Math.cos(angle - Math.PI / 2) * (that.innerRadius + 80);
                    const extendY = Math.sin(angle - Math.PI / 2) * (that.innerRadius + 80);
                    const spokeName = (typeof subItem == 'string') ? subItem : subItem.text;
                    const indicator = that.getSpokeVisualIndicator(subItem);
                    const textStyle = that.getSpokeTextStyle(subItem);

                    // Draw line
                    expandedGroup.append('line')
                        .attr('class', 'sub-item-line')
                        .attr('x1', 0)
                        .attr('y1', 0)
                        .attr('x2', extendX)
                        .attr('y2', extendY)
                        .attr('stroke', '#666')
                        .attr('stroke-width', 2);

                    // Horizontal line
                    const horizontalLength = 40;
                    const direction = extendX > 0 ? 1 : -1;
                    expandedGroup.append('line')
                        .attr('class', 'sub-item-line')
                        .attr('x1', extendX)
                        .attr('y1', extendY)
                        .attr('x2', extendX + (horizontalLength * direction))
                        .attr('y2', extendY)
                        .attr('stroke', '#666')
                        .attr('stroke-width', 2);

                    // Label with spoke type indicator
                    const spokeLabel = expandedGroup.append('text')
                        .attr('class', 'sub-item-label')
                        .style('font-size', '13px')
                        .style('font-weight', '600')
                        .attr('x', extendX + ((horizontalLength + 5) * direction))
                        .attr('y', extendY + 4)
                        .attr('text-anchor', extendX > 0 ? 'start' : 'end')
                        .text(spokeName + indicator);

                    // Apply text styling based on spoke type
                    Object.keys(textStyle).forEach(key => {
                        spokeLabel.style(key, textStyle[key]);
                    });
                });
            }
        }, 100)

    },

    collapseSlice() {
        this.currentExpanded = null;
        this.highlightGroup.selectAll('*').remove();
        this.svg.selectAll('.sub-item-label, .sub-item-line, .inner-slice, .outer-slice, .category-label, .category-percentage, .item-label')
            .transition().duration(100)
            .style('opacity', 1)
    },

    expandCategory(categoryData, allCategories) {
        this.currentExpanded = categoryData;
        const that = this;

        setTimeout(() => {
            // Clear any existing highlight
            that.highlightGroup.selectAll('*').remove();

            // Calculate expansion factor for category
            const angleSize = categoryData.endAngle - categoryData.startAngle;
            const anglePercentage = (angleSize / (2 * Math.PI)) * 100;

            let targetPercentage;
            if (anglePercentage < 30) {
                targetPercentage = 30;
            } else if (anglePercentage < 60) {
                targetPercentage = 60;
            } else {
                targetPercentage = 100
            }

            // Calculate scale factor
            const scaleFactor = targetPercentage / anglePercentage;
            const newAngleSize = angleSize * scaleFactor;

            // Center the expansion around the category's midpoint
            const midAngle = (categoryData.startAngle + categoryData.endAngle) / 2;
            const newStartAngle = midAngle - (newAngleSize / 2);
            const newEndAngle = midAngle + (newAngleSize / 2);

            // Calculate translation: pull wedge INWARD (negative direction) by 30% of innerRadius
            const translateDistance = -that.innerRadius * 0.3;
            const translateX = Math.cos(midAngle - Math.PI / 2) * translateDistance;
            const translateY = Math.sin(midAngle - Math.PI / 2) * translateDistance;

            // Create expanded outer arc (category)
            const expandedOuterArc = d3.arc()
                .innerRadius(that.innerRadius)
                .outerRadius(that.outerRadius + 80)
                .startAngle(newStartAngle)
                .endAngle(newEndAngle);

            // Draw expanded category slice with translation
            const expandedGroup = that.highlightGroup.append('g')
                .attr('class', 'expanded-category')
                .attr('transform', `translate(${translateX}, ${translateY})`);

            expandedGroup.append('path')
                .attr('d', expandedOuterArc)
                .attr('fill', categoryData.data.color)
                .attr('stroke', 'white')
                .attr('stroke-width', 4)
                .attr('opacity', 0.8);

            // Expand inner items within this category
            const category = categoryData.data;
            const items = category.items;

            if (items && items.length > 0) {
                // Create pie for items within expanded angle
                const itemPie = d3.pie()
                    .value(d => d.percentage)
                    .sort(null)
                    .startAngle(newStartAngle)
                    .endAngle(newEndAngle);

                const expandedInnerArc = d3.arc()
                    .innerRadius(0)
                    .outerRadius(that.innerRadius);

                const itemData = itemPie(items);

                // Draw expanded items
                itemData.forEach((itemDatum, itemIndex) => {
                    expandedGroup.append('path')
                        .attr('d', expandedInnerArc(itemDatum))
                        .attr('fill', itemDatum.data.color)
                        .attr('stroke', 'white')
                        .attr('stroke-width', 2);

                    // Item label (only if enough space)
                    if ((itemDatum.endAngle - itemDatum.startAngle) > 0.15) {
                        const itemMidAngle = (itemDatum.startAngle + itemDatum.endAngle) / 2;
                        const labelRadius = that.innerRadius / 2;
                        const x = Math.cos(itemMidAngle - Math.PI / 2) * labelRadius;
                        const y = Math.sin(itemMidAngle - Math.PI / 2) * labelRadius;

                        let rotation = (itemMidAngle * 180 / Math.PI) - 90;
                        if (rotation > 90 && rotation < 270) {
                            rotation += 180;
                        }

                        const textColor = that.isColorDark(itemDatum.data.color) ? '#ffffff' : '#333333';
                        expandedGroup.append('text')
                            .attr('class', 'item-label')
                            .style('fill', textColor)
                            .style('font-size', '15px')
                            .style('font-weight', 'bold')
                            .attr('transform', `translate(${x}, ${y}) rotate(${rotation})`)
                            .attr('text-anchor', 'middle')
                            .text(itemDatum.data.name);
                    }

                    // Draw sub-items for each item
                    const subItems = itemDatum.data.subItems;
                    if (subItems && subItems.length > 0) {
                        const subAngleStep = (itemDatum.endAngle - itemDatum.startAngle) / subItems.length;

                        subItems.forEach((subItem, idx) => {
                            const angle = itemDatum.startAngle + (subAngleStep * (idx + 0.5));
                            const extendX = Math.cos(angle - Math.PI / 2) * (that.outerRadius + 110);
                            const extendY = Math.sin(angle - Math.PI / 2) * (that.outerRadius + 110);
                            const spokeName = (typeof subItem == 'string' ? subItem : subItem.text);
                            const indicator = that.getSpokeVisualIndicator(subItem);
                            const textStyle = that.getSpokeTextStyle(subItem);

                            // Draw line from center
                            expandedGroup.append('line')
                                .attr('class', 'sub-item-line')
                                .attr('x1', 0)
                                .attr('y1', 0)
                                .attr('x2', extendX)
                                .attr('y2', extendY)
                                .attr('stroke', '#666')
                                .attr('stroke-width', 2);

                            // Horizontal line
                            const horizontalLength = 40;
                            const direction = extendX > 0 ? 1 : -1;
                            expandedGroup.append('line')
                                .attr('class', 'sub-item-line')
                                .attr('x1', extendX)
                                .attr('y1', extendY)
                                .attr('x2', extendX + (horizontalLength * direction))
                                .attr('y2', extendY)
                                .attr('stroke', '#666')
                                .attr('stroke-width', 2);

                            // Label with spoke type indicator
                            const spokeLabel = expandedGroup.append('text')
                                .attr('class', 'sub-item-label')
                                .style('font-size', '13px')
                                .style('font-weight', '600')
                                .attr('x', extendX + ((horizontalLength + 5) * direction))
                                .attr('y', extendY + 4)
                                .attr('text-anchor', extendX > 0 ? 'start' : 'end')
                                .text(spokeName + indicator);

                            // Apply text styling based on spoke type
                            Object.keys(textStyle).forEach(key => {
                                spokeLabel.style(key, textStyle[key]);
                            });
                        });
                    }
                });
            }

            // Category label on expanded view
            const labelRadius = (that.innerRadius + that.outerRadius + 80) / 2;
            const x = Math.cos(midAngle - Math.PI / 2) * labelRadius;
            const y = Math.sin(midAngle - Math.PI / 2) * labelRadius;

            let rotation = (midAngle * 180 / Math.PI) - 90;
            if (rotation > 90 && rotation < 270) {
                rotation += 180;
            }

            const textColor = that.isColorDark(categoryData.data.color) ? '#ffffff' : '#333333';

            expandedGroup.append('text')
                .attr('class', 'category-label')
                .style('fill', textColor)
                .style('font-size', '24px')
                .style('font-weight', 'bold')
                .attr('transform', `translate(${x}, ${y}) rotate(${rotation})`)
                .attr('text-anchor', 'middle')
                .text(categoryData.data.name);

            expandedGroup.append('text')
                .attr('class', 'category-percentage')
                .style('fill', textColor)
                .style('font-size', '18px')
                .attr('transform', `translate(${x}, ${y + 25}) rotate(${rotation})`)
                .attr('text-anchor', 'middle')
                .text(`${categoryData.data.percentage.toFixed(1)}%`);

            that.highlightGroup.raise();

            // Click to collapse
            this.highlightGroup.on('click', (event) => {
                that.collapseSlice();
            });

            // Fade base layer ONLY (not the highlight group)
            that.svg.selectAll('.outer-slice, .inner-slice')
                .transition().duration(100)
                .style('opacity', 0.03);
            
            that.svg.selectAll('.sub-item-label, .sub-item-line, .category-label, .category-percentage, .item-label')
                .filter(function() {
                    // Only fade elements that are NOT in the highlight group
                    return !this.closest('.highlight-layer');
                })
                .transition().duration(100)
                .style('opacity', 0.03);

        }, 100);
    },
    expandBranch(spokeData, categoryData, itemData, spokeAngle, categoryId, itemId, spokeIndex) {

        this.currentExpanded = spokeData;
        this.currentExpandedLocation = { categoryId, itemId, spokeIndex };
        const that = this;
        // Store location info for click handlers
        const dataLocation = { categoryId, itemId, spokeIndex };
        
        setTimeout(() => {
            // Calculate opposite corner for pie shrinkage
            const renderAngle = spokeAngle - Math.PI / 2;
            const branchX = Math.cos(renderAngle);
            const branchY = Math.sin(renderAngle);

            // Move pie to opposite corner (scale down and translate)
            const shrinkScale = 0.925;
            const translateDistance = 108;
            const pieTranslateX = -branchX * translateDistance;
            const pieTranslateY = -branchY * translateDistance;

            // Shrink and move main pie
            that.svg.transition().duration(300)
                .attr('transform', `translate(${that.width / 2 + pieTranslateX}, ${that.height / 2 + pieTranslateY}) scale(${shrinkScale})`);

            // Calculate text's visual angle (text is horizontal by default, then rotated)
            const testX = branchX;
            const testY = branchY;
            const verticalness = Math.abs(testY);
            const maxRotation = 30;
            const rotationAmount = verticalness * maxRotation;

            // Text rotation from horizontal baseline
            let textRotationDeg;
            if (testX > 0) {
                textRotationDeg = testY < 0 ? -rotationAmount : rotationAmount;
            } else {
                textRotationDeg = testY < 0 ? rotationAmount : -rotationAmount;
            }

            // Branch should follow text's visual direction:
            // - Right side (testX > 0): branch goes right, tilted by textRotation
            // - Left side (testX < 0): branch goes left, tilted by textRotation
            const baseAngleDeg = testX > 0 ? 0 : 180;  // Horizontal right or left
            const branchAngleDeg = baseAngleDeg + textRotationDeg;
            const branchAngleRad = (branchAngleDeg * Math.PI) / 180;

            // Starting point for branch (from spoke position)
            const startX = Math.cos(renderAngle) * (that.outerRadius + 70);
            const startY = Math.sin(renderAngle) * (that.outerRadius + 80);

            // Create branch visualization
            const branchGroup = that.highlightGroup.append('g')
                .attr('class', 'branch-view');

            // Calculate branch length based on spoke label text
            const spokeText = spokeData.text || spokeData;
            const indicator = that.getSpokeVisualIndicator(spokeData);
            const fullLabel = spokeText + indicator;
            // Approximate width: ~7px per character at 14px font, plus padding
            const textWidth = fullLabel.length * 7;
            const branchLength = Math.max(60, textWidth + 15);  // minimum 60px, plus padding
            const branchEndX = startX + (Math.cos(branchAngleRad) * branchLength);
            const branchEndY = startY + (Math.sin(branchAngleRad) * branchLength);

            branchGroup.append('line')
                .attr('x1', startX)
                .attr('y1', startY)
                .attr('x2', branchEndX)
                .attr('y2', branchEndY)
                .attr('stroke', '#888')
                .attr('stroke-width', 1);

            // Draw children - single child at end of trunk, multiple as branches
            const children = spokeData.children || [];

            // Helper to render a single action (icon + label)
            const renderAction = (child, idx, posX, posY, labelAnchor = 'middle') => {
                const hasSchedule = child.scheduled && child.scheduled.date && child.scheduled.time;
                const childDataLocation = { ...dataLocation, childIndex: idx };

                // Add calendar icon/button or scheduled time
                const iconGroup = branchGroup.append('g')
                    .attr('transform', `translate(${posX}, ${posY - 25})`)
                    .style('cursor', 'pointer')
                    .on('click', function(event) {
                        event.stopPropagation();
                        that.openCalendarForAction(child, spokeData, itemData.data.name, categoryData.data.name, childDataLocation);
                    });

                if (hasSchedule) {
                    const schedDate = new Date(`${child.scheduled.date}T${child.scheduled.time}`);
                    const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

                    iconGroup.append('rect')
                        .attr('x', -45)
                        .attr('y', -12)
                        .attr('width', 90)
                        .attr('height', 24)
                        .attr('rx', 12)
                        .attr('fill', '#4CAF50')
                        .attr('stroke', 'white')
                        .attr('stroke-width', 2);

                    iconGroup.append('text')
                        .attr('text-anchor', 'middle')
                        .attr('dy', '0.35em')
                        .style('font-size', '11px')
                        .style('fill', 'white')
                        .style('font-weight', 'bold')
                        .text(`${dateStr} ${timeStr}`);
                } else {
                    iconGroup.append('circle')
                        .attr('r', 10)
                        .attr('fill', '#4285F4')
                        .attr('stroke', 'white')
                        .attr('stroke-width', 2);

                    iconGroup.append('text')
                        .attr('text-anchor', 'middle')
                        .attr('dy', '0.35em')
                        .style('font-size', '12px')
                        .style('fill', 'white')
                        .style('font-weight', 'bold')
                        .text('📅');
                }

                // Child label
                branchGroup.append('text')
                    .attr('x', posX)
                    .attr('y', posY - 5)
                    .attr('text-anchor', labelAnchor)
                    .style('font-size', '14px')
                    .style('fill', '#333')
                    .text(child.text || child)
                    .on('click', function(event) {
                        event.stopPropagation();
                        that.openCalendarForAction(child, spokeData, itemData.data.name, categoryData.data.name, childDataLocation);
                    });
            };

            if (children.length === 1) {
                // Single child: place at end of trunk, no branch line
                renderAction(children[0], 0, branchEndX, branchEndY);
            } else {
                // Multiple children: draw as branches
                const childAngleSpread = Math.PI / 3; // 60 degrees spread
                const childAngleStart = branchAngleRad - (childAngleSpread / 2);

                children.forEach((child, idx) => {
                    const childAngle = childAngleStart + (childAngleSpread * idx / Math.max(1, children.length - 1));
                    const childLength = 120;
                    const textPadding = 30;
                    const childEndX = branchEndX + (Math.cos(childAngle) * childLength);
                    const childEndY = branchEndY + (Math.sin(childAngle) * childLength);
                    const textX = branchEndX + (Math.cos(childAngle) * (childLength + textPadding));
                    const textY = branchEndY + (Math.sin(childAngle) * (childLength + textPadding));

                    // Child branch line
                    branchGroup.append('line')
                        .attr('x1', branchEndX)
                        .attr('y1', branchEndY)
                        .attr('x2', childEndX)
                        .attr('y2', childEndY)
                        .attr('stroke', '#666')
                        .attr('stroke-width', 2);

                    renderAction(child, idx, textX, textY);
                });
            }
            
            that.highlightGroup.raise();

            // Add document-level click handler to collapse when clicking outside branch
            // Use setTimeout to avoid the current click event triggering it immediately
            setTimeout(() => {
                that.branchClickOutsideHandler = function(event) {
                    // Check if click is within the branch-view group
                    const branchView = document.querySelector('.branch-view');
                    if (branchView && branchView.contains(event.target)) {
                        return; // Click was on branch elements, don't collapse
                    }
                    // Click was outside - collapse
                    that.collapseBranch();
                };
                document.addEventListener('click', that.branchClickOutsideHandler);
            }, 50);

        }, 100);
    },

    collapseBranch() {
        this.currentExpanded = null;
        this.currentExpandedLocation = null;
        this.highlightGroup.selectAll('*').remove();

        // Remove document click handler
        if (this.branchClickOutsideHandler) {
            document.removeEventListener('click', this.branchClickOutsideHandler);
            this.branchClickOutsideHandler = null;
        }

        // Restore main pie position and scale
        this.svg.transition().duration(300)
            .attr('transform', `translate(${this.width / 2}, ${this.height / 2}) scale(1)`);
    },
    openCalendarForAction(action, spokeData, itemData, categoryData, dataLocation = null) {
        const actionText = action.text || action;
        const spokeText = spokeData.text || spokeData;
        const sliceName = itemData;
        const categoryName = categoryData;

        UI.showDateTimePicker(actionText, spokeText, sliceName, categoryName, dataLocation);
    },
    getDefaultEventDates() {
        // Set event for tomorrow at 9 AM, duration 1 hour
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        
        const endTime = new Date(tomorrow);
        endTime.setHours(10, 0, 0, 0);
        
        // Format: YYYYMMDDTHHmmssZ/YYYYMMDDTHHmmssZ
        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        return `${formatDate(tomorrow)}/${formatDate(endTime)}`;
    }
};