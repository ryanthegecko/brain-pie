const ChartRenderer = {
    svg: null,
    width: 1800,
    height: 1300,
    outerRadius: 550,
    innerRadius: 490,
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
        this.height = containerHeight;
        this.outerRadius = Math.min(550, minDimension * 0.4);
        this.innerRadius = this.outerRadius - 60;
        
        this.svg = container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g')
            .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
        
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
                .attr('startOffset', '25%')
                .attr('text-anchor', 'middle')
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
                const labelRadius = this.innerRadius / 2;

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

            // Draw sub-items - EXTENDING PAST OUTER RING
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

                    // Extend line through inner ring, through outer ring, and beyond
                    const extendX = Math.cos(angle - Math.PI / 2) * (this.outerRadius + 30);
                    const extendY = Math.sin(angle - Math.PI / 2) * (this.outerRadius + 30);

                    // Draw line from center through both rings
                    group.append('line')
                        .attr('class', 'sub-item-line')
                        .attr('x1', innerX)
                        .attr('y1', innerY)
                        .attr('x2', extendX)
                        .attr('y2', extendY);

                    // Draw horizontal line to label
                    const horizontalLength = 35;
                    const direction = extendX > 0 ? 1 : -1;
                    group.append('line')
                        .attr('class', 'sub-item-line')
                        .attr('x1', extendX)
                        .attr('y1', extendY)
                        .attr('x2', extendX + (horizontalLength * direction))
                        .attr('y2', extendY);

                    // Add label
                    group.append('text')
                        .attr('class', 'sub-item-label')
                        .attr('x', extendX + ((horizontalLength + 5) * direction))
                        .attr('y', extendY + 4)
                        .attr('text-anchor', extendX > 0 ? 'start' : 'end')
                        .text(subItem);
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
                        .text(subItem);
                });
            }
        }, 100)

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
                                .text(subItem);
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

    collapseSlice() {
        this.currentExpanded = null;
        this.highlightGroup.selectAll('*').remove();
        this.svg.selectAll('.sub-item-label, .sub-item-line, .inner-slice, .outer-slice, .category-label, .category-percentage, .item-label')
            .transition().duration(100)
            .style('opacity', 1)
    }
};