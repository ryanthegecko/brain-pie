const ChartRenderer = {
    svg: null,
    // width: 2200,
    // height: 1200,
    // outerRadius: 600,
    // innerRadius: 550,
    highlightGroup: null,
    currentExpanded: null,
    
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
                // .attr('text-anchor', 'bottom')
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

            // Add hover effect
            itemSlices.on('click', (event, d) => {
                event.stopPropagation();
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
                    
                    // if (typeof subItem == 'object'){
                    //     alert(subItem);
                    //     return
                    // }
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

                    // Add label with click handler for branches
                    const spokeLabel = group.append('text')
                        .attr('class', 'sub-item-label')
                        .attr('transform', `translate(${labelX}, ${labelY}) rotate(${textRotation})`)
                        .attr('text-anchor', extendX > 0 ? 'start' : 'end')
                        .style('cursor', 'pointer')
                        .text(typeof subItem === 'string' ? subItem : subItem.text)
                        .on('click', function(event) {
                            event.stopPropagation();
                            ChartRenderer.expandBranch(subItem, catData, d, angle);
                        });
                    
                    // Visual indicator if spoke has children
                    if (typeof subItem === 'object' && subItem.children && subItem.children.length > 0) {
                        spokeLabel.text(spokeLabel.text() + '•')
                        spokeLabel.style('font-weight', 'bold')
                            .style('fill', '#333333');
                    }

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
                    const text = (typeof subItem == 'string') ? subItem : subItem.text;
                    
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

                    // Label
                    expandedGroup.append('text')
                        .attr('class', 'sub-item-label')
                        .style('font-size', '13px')
                        .style('font-weight', '600')
                        .attr('x', extendX + ((horizontalLength + 5) * direction))
                        .attr('y', extendY + 4)
                        .attr('text-anchor', extendX > 0 ? 'start' : 'end')
                        .text(text);
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
                            const name = (typeof subItem == 'string' ? subItem :subItem.text)
                            
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

                            // Label
                            expandedGroup.append('text')
                                .attr('class', 'sub-item-label')
                                .style('font-size', '13px')
                                .style('font-weight', '600')
                                .attr('x', extendX + ((horizontalLength + 5) * direction))
                                .attr('y', extendY + 4)
                                .attr('text-anchor', extendX > 0 ? 'start' : 'end')
                                .text(name);
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
    expandBranch(spokeData, categoryData, itemData, spokeAngle) {

        this.currentExpanded = spokeData;
        const that = this;
        
        setTimeout(() => {
            // Calculate opposite corner for pie shrinkage
            const renderAngle = spokeAngle - Math.PI / 2;
            const branchX = Math.cos(renderAngle);
            const branchY = Math.sin(renderAngle);
            
            // Move pie to opposite corner (scale down and translate)
            const shrinkScale = 0.7;
            const translateDistance = 300;
            const pieTranslateX = -branchX * translateDistance;
            const pieTranslateY = -branchY * translateDistance;
            
            // Shrink and move main pie
            that.svg.transition().duration(300)
                .attr('transform', `translate(${that.width / 2 + pieTranslateX}, ${that.height / 2 + pieTranslateY}) scale(${shrinkScale})`);
            
            // Create branch visualization
            const branchGroup = that.highlightGroup.append('g')
                .attr('class', 'branch-view');
            
            // Starting point for branch (from spoke position)
            const startX = Math.cos(renderAngle) * (that.outerRadius + 70);
            const startY = Math.sin(renderAngle) * (that.outerRadius + 80);
            
            // Draw main branch line
            const branchLength = 100;
            const branchEndX = startX + (Math.cos(renderAngle) * branchLength);
            const branchEndY = startY + (Math.sin(renderAngle) * branchLength);
            
            branchGroup.append('line')
                .attr('x1', startX)
                .attr('y1', startY)
                .attr('x2', branchEndX)
                .attr('y2', branchEndY)
                .attr('stroke', '#333')
                .attr('stroke-width', 4);
            
            // Draw spoke name at branch start
            // branchGroup.append('text')
            //     .attr('x', startX)
            //     .attr('y', startY - 10)
            //     .attr('text-anchor', 'middle')
            //     .style('font-size', '18px')
            //     .style('font-weight', 'bold')
            //     .style('fill', '#333')
            //     .text(spokeData.text || spokeData);
            
            // Draw children as sub-branches
            const children = spokeData.children || [];
            const childAngleSpread = Math.PI / 3; // 60 degrees spread
            const childAngleStart = renderAngle - (childAngleSpread / 2);
            
            children.forEach((child, idx) => {
                const childAngle = childAngleStart + (childAngleSpread * idx / Math.max(1, children.length - 1));
                const childLength = 150;
                const childStartX = branchEndX;
                const childStartY = branchEndY;
                const childEndX = childStartX + (Math.cos(childAngle) * childLength);
                const childEndY = childStartY + (Math.sin(childAngle) * childLength);
                
                // Child branch line
                branchGroup.append('line')
                    .attr('x1', childStartX)
                    .attr('y1', childStartY)
                    .attr('x2', childEndX)
                    .attr('y2', childEndY)
                    .attr('stroke', '#666')
                    .attr('stroke-width', 2);

                // Add calendar icon/button
                const iconSize = 20;
                const iconGroup = branchGroup.append('g')
                    .attr('transform', `translate(${childEndX}, ${childEndY - 25})`)
                    .style('cursor', 'pointer')
                    .on('click', function(event) {
                        event.stopPropagation();
                        that.openCalendarForAction(child, spokeData, itemData.data.name, categoryData.data.name);
                    });
                
                // Calendar icon background
                iconGroup.append('circle')
                    .attr('r', iconSize / 2)
                    .attr('fill', '#4285F4')
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
                
                // Calendar icon (simplified)
                iconGroup.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.35em')
                    .style('font-size', '12px')
                    .style('fill', 'white')
                    .style('font-weight', 'bold')
                    .text('📅');    
                
                // Child label
                branchGroup.append('text')
                    .attr('x', childEndX)
                    .attr('y', childEndY - 5)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '14px')
                    .style('fill', '#333')
                    .text(child.text || child)
                    .on('click', function(event) {
                        event.stopPropagation();
                        that.openCalendarForAction(child, spokeData, itemData.data.name, categoryData.data.name);
                    });
            });
            
            that.highlightGroup.raise();
            
            // Click to collapse
            that.highlightGroup.on('click', () => {
                that.collapseBranch();
            });
            
        }, 100);
    },
    
    collapseBranch() {
        this.currentExpanded = null;
        this.highlightGroup.selectAll('*').remove();
        
        // Restore main pie position and scale
        this.svg.transition().duration(300)
            .attr('transform', `translate(${this.width / 2}, ${this.height / 2}) scale(1)`);
    },
    // openCalendarForAction(action, spokeData, sliceName, categoryName) {
    //     // Get context for the calendar event
    //     const actionText = action.text || action;
    //     const spokeText = spokeData.text || spokeData;
    //     // const sliceName = decodeURIComponent(sliceName);
    //     // const categoryName = decodeURIComponent(categoryName);

    //     const provider = UI.getCalendarProvider();
        
    //     const tomorrow = new Date();
    //     tomorrow.setDate(tomorrow.getDate() + 1);
    //     tomorrow.setHours(9, 0, 0, 0);
        
    //     const endTime = new Date(tomorrow);
    //     endTime.setHours(10, 0, 0, 0);
    //  if (provider === 'apple') {  
    //     UI.downloadAppleCalendarEvent(actionText, spokeText, sliceName, categoryName, tomorrow, endTime);
    //  } else {
    //     // Build calendar URL with pre-filled data
    //     const params = new URLSearchParams({
    //         action: 'TEMPLATE',
    //         text: `${actionText} (${spokeText}/${sliceName}/${categoryName})`,
    //         details: `Action: ${actionText}\nSpoke: ${spokeText}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`,
    //         // Optional: Set default time (tomorrow at 9am)
    //         dates: this.getDefaultEventDates(),
    //     });
        
    //     const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
        
    //     // Open in new tab
    //     window.open(calendarUrl, '_blank');
    //     }



    // },
    openCalendarForAction(action, spokeData, itemData, categoryData) {
        const actionText = action.text || action;
        const spokeText = spokeData.text || spokeData;
        const sliceName = itemData;
        const categoryName = categoryData;
        
        UI.showDateTimePicker(actionText, spokeText, sliceName, categoryName);
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