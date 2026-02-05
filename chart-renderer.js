const ChartRenderer = {
    svg: null,
    highlightGroup: null,
    expandedView: null,  // { type: 'slice'|'category', categoryId, itemId? }
    _wasExpanded: false,  // Track previous state for crossfade animation
    currentExpandedLocation: null,  // Track {categoryId, itemId, spokeIndex} for toggle (branch expansion)
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

        // Backwards compat: 'action' → 'list'
        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';

        const hasChildren = spoke.children && spoke.children.length > 0;
        const hasSchedule = spoke.scheduled && spoke.scheduled.date;
        const hasRecurrence = spoke.metadata && spoke.metadata.recurrence;

        // Show type indicators based on type
        switch(type) {
            case 'single':
                if (hasSchedule) {
                    // Show date pill
                    const schedDate = new Date(`${spoke.scheduled.date}T${spoke.scheduled.time || '00:00'}`);
                    const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return ` • ${dateStr}`;
                }
                return ' 📅';
            case 'repeating':
                if (hasRecurrence) {
                    return ' 🔁';
                }
                return ' 🔁';
            case 'list':
                // For list type, show action count
                if (hasChildren) {
                    return ` • (${spoke.children.length})`;
                }
                return ' ☑️';
            case 'static':
            default:
                return '';
        }
    },

    getSpokeTextStyle(spoke) {
        if (typeof spoke === 'string') return {};

        // Backwards compat: 'action' → 'list'
        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';

        const hasChildren = spoke.children && spoke.children.length > 0;
        const hasSchedule = spoke.scheduled && spoke.scheduled.date;

        let style = {};

        // List with children are bold
        if (type === 'list' && hasChildren) {
            style['font-weight'] = 'bold';
        }

        // Scheduled single spokes are bold
        if (type === 'single' && hasSchedule) {
            style['font-weight'] = 'bold';
        }

        // Repeating spokes are bold
        if (type === 'repeating') {
            style['font-weight'] = 'bold';
        }

        return style;
    },

    // Get the pill text for single/repeating/list spokes (icon or date)
    getSchedulePillText(spoke) {
        if (typeof spoke === 'string') return null;

        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';

        if (type === 'single') {
            if (spoke.scheduled && spoke.scheduled.date) {
                const schedDate = new Date(`${spoke.scheduled.date}T${spoke.scheduled.time || '00:00'}`);
                return schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
            return '📅';  // Unscheduled single - show calendar icon in pill
        }

        if (type === 'repeating') {
            if (spoke.metadata && spoke.metadata.recurrence) {
                return this.formatRecurrencePillText(spoke.metadata.recurrence);
            }
            return '🔁';
        }

        if (type === 'list') {
            const hasChildren = spoke.children && spoke.children.length > 0;
            if (hasChildren) {
                return `☑️ (${spoke.children.length})`;
            }
            return '☑️';
        }

        return null;
    },

    // Get pill background color based on spoke state
    getSchedulePillColor(spoke) {
        if (typeof spoke === 'string') return null;

        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';

        const hasSchedule = spoke.scheduled && spoke.scheduled.date;
        const hasRecurrence = spoke.metadata && spoke.metadata.recurrence;

        // Green for scheduled, blue for unscheduled/list
        if (type === 'single') {
            return hasSchedule ? '#4CAF50' : '#2196F3';
        }
        if (type === 'repeating') {
            return hasRecurrence ? '#4CAF50' : '#2196F3';
        }
        if (type === 'list') {
            return '#2196F3';  // Blue for list type
        }

        return null;
    },

    // Format recurrence data into short pill text like "Mon, Wed, 17:45"
    formatRecurrencePillText(recurrence) {
        if (!recurrence) return '🔁';

        const dayNames = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
        let parts = [];

        const freq = recurrence.frequency;
        const interval = recurrence.interval || 1;

        if (freq === 'WEEKLY' && recurrence.byDay && recurrence.byDay.length > 0) {
            parts.push(recurrence.byDay.map(d => dayNames[d] || d).join(', '));
        } else if (freq === 'DAILY') {
            parts.push(interval === 1 ? 'Daily' : `Every ${interval}d`);
        } else if (freq === 'WEEKLY') {
            parts.push(interval === 1 ? 'Weekly' : `Every ${interval}w`);
        } else if (freq === 'MONTHLY') {
            if (recurrence.byMonthDay) {
                parts.push(`${recurrence.byMonthDay}${UI.getOrdinalSuffix(recurrence.byMonthDay)}`);
            } else {
                parts.push(interval === 1 ? 'Monthly' : `Every ${interval}mo`);
            }
        } else if (freq === 'YEARLY') {
            parts.push(interval === 1 ? 'Yearly' : `Every ${interval}y`);
        }

        if (recurrence.time) {
            parts.push(recurrence.time);
        }

        return parts.join(', ');
    },

    // Get indicator for static spokes only (other types use pills)
    getSpokeIndicatorWithoutSchedule(spoke) {
        if (typeof spoke === 'string') return '';

        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';

        switch(type) {
            case 'single':
            case 'repeating':
            case 'list':
                // These types use pills instead of text indicators
                return '';
            case 'static':
            default:
                return '';
        }
    },

    // Add schedule pill after spoke name text element
    addSchedulePill(group, nameTextElement, spoke, isRightSide, fontSize = 12) {
        const pillText = this.getSchedulePillText(spoke);
        if (!pillText) return;

        const pillColor = this.getSchedulePillColor(spoke) || '#4CAF50';

        // Get name text bounding box after brief delay
        setTimeout(() => {
            try {
                const nameBbox = nameTextElement.node().getBBox();
                const padding = { x: 6, y: 3 };
                const gap = 10;  // Gap between name and pill

                // Position pill after/before name based on side
                let pillX;
                if (isRightSide) {
                    pillX = nameBbox.x + nameBbox.width + gap;
                } else {
                    // For left side, pill goes before name - need to measure pill text first
                    pillX = nameBbox.x - gap;
                }

                // Create pill group
                const pillGroup = group.append('g').attr('class', 'schedule-pill');

                // Add pill text first to measure it
                const pillTextEl = pillGroup.append('text')
                    .attr('font-size', fontSize + 'px')
                    .attr('fill', '#ffffff')
                    .attr('text-anchor', isRightSide ? 'start' : 'end')
                    .attr('x', pillX)
                    .attr('y', nameBbox.y + nameBbox.height - 2)
                    .text(pillText);

                // Get pill text bbox and add rect behind it
                const pillTextBbox = pillTextEl.node().getBBox();
                pillGroup.insert('rect', 'text')
                    .attr('x', pillTextBbox.x - padding.x)
                    .attr('y', pillTextBbox.y - padding.y)
                    .attr('width', pillTextBbox.width + padding.x * 2)
                    .attr('height', pillTextBbox.height + padding.y * 2)
                    .attr('rx', 10)
                    .attr('ry', 10)
                    .attr('fill', pillColor);

            } catch (e) {
                // Text element may not be in DOM yet
            }
        }, 10);
    },

    handleSpokeClick(event, subItem, catData, sliceData, spokeIndex, categoryId, itemId) {
        event.stopPropagation();

        // Get spoke type
        const spokeType = DataModel.getSpokeType(categoryId, itemId, spokeIndex);
        const hasChildren = (typeof subItem === 'object' && subItem.children && subItem.children.length > 0);

        // For list type with children, show branch expansion
        if (spokeType === 'list' && hasChildren) {
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
        } else if (spokeType === 'single') {
            // For single type, open date/time picker directly
            this.collapseIfBranchExpanded();
            UI.openSpokeScheduler(categoryId, itemId, spokeIndex);
        } else if (spokeType === 'repeating') {
            // For repeating type, open recurrence picker directly
            this.collapseIfBranchExpanded();
            UI.openSpokeRecurrenceScheduler(categoryId, itemId, spokeIndex);
        } else {
            // For static type or list without children, show spoke type picker
            this.collapseIfBranchExpanded();
            UI.showSpokeTypePicker(categoryId, itemId, spokeIndex);
        }
    },
    
    init(containerId) {
        const container = d3.select(`#${containerId}`);
        container.selectAll('*').remove();
        
        // Get container dimensions
        const containerNode = document.getElementById(containerId);
        const containerWidth = containerNode.clientWidth;
        const containerHeight = Math.max(containerNode.clientHeight, 660);
        
        // Calculate responsive dimensions
        const minDimension = Math.min(containerWidth, containerHeight);
        this.width = containerWidth;
        this.height = containerHeight;
        // this.height = containerWidth > 1024 ? containerHeight : containerHeight / 1.3;
        this.outerRadius = Math.min(containerWidth <= 1024 ? 350 : 550, minDimension * 0.33);
        this.innerRadius = containerWidth <= 1024 ? this.outerRadius - 40 : this.outerRadius - 40;
        
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
        let categoryData = categories.map(cat => ({
            ...cat,
            percentage: DataModel.getCategoryPercentage(cat.id)
        })).filter(cat => cat.items.length > 0);

        // Override data for expanded view (full-pie takeover)
        if (this.expandedView) {
            const ev = this.expandedView;
            if (ev.type === 'slice') {
                // Find the parent category and the target slice
                const parentCat = categoryData.find(c => c.id === ev.categoryId);
                const targetSlice = parentCat && parentCat.items.find(item => item.id === ev.itemId);
                if (parentCat && targetSlice) {
                    categoryData = [{
                        ...parentCat,
                        percentage: 100,
                        items: [{ ...targetSlice, percentage: 100 }]
                    }];
                } else {
                    // Data no longer exists, collapse
                    this.expandedView = null;
                }
            } else if (ev.type === 'category') {
                const targetCat = categoryData.find(c => c.id === ev.categoryId);
                if (targetCat) {
                    categoryData = [{
                        ...targetCat,
                        percentage: 100
                    }];
                } else {
                    this.expandedView = null;
                }
            }
        }

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
            if (this.expandedView) {
                // In expanded view, clicking outer ring collapses back to full pie
                this.collapseToFullPie();
            } else {
                this.expandedView = { type: 'category', categoryId: d.data.id };
                App.render();
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
                if (this.expandedView && this.expandedView.type === 'slice') {
                    // In slice expanded view, clicking the slice collapses
                    this.collapseToFullPie();
                } else if (this.expandedView && this.expandedView.type === 'category') {
                    // In category expanded view, clicking a slice drills into it
                    this.expandedView = { type: 'slice', categoryId: catData.data.id, itemId: d.data.id };
                    App.render();
                } else {
                    // Normal view - expand to slice takeover
                    this.expandedView = { type: 'slice', categoryId: catData.data.id, itemId: d.data.id };
                    App.render();
                }
            });

            // Item labels - RADIAL TEXT along the wedge angle
            itemSlices.each((d, i, nodes) => {
                const group = d3.select(nodes[i]);
                let midAngle = (d.startAngle + d.endAngle) / 1.995;
                const labelRadius = this.innerRadius / 1.7;

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

                if (!subItems || subItems.length === 0) return;
                
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
                    const indicator = ChartRenderer.getSpokeIndicatorWithoutSchedule(subItem);
                    const textStyle = ChartRenderer.getSpokeTextStyle(subItem);
                    const isRightSide = extendX > 0;

                    // Put indicator on outside edge: right side = text+indicator, left side = indicator+text
                    const labelText = isRightSide ? spokeName + indicator : indicator + spokeName;

                    // Create a group for the label (to support pill background)
                    const labelGroup = group.append('g')
                        .attr('class', 'spoke-label-group')
                        .attr('transform', `translate(${labelX}, ${labelY}) rotate(${textRotation})`)
                        .style('cursor', 'pointer')
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

                    const spokeLabel = labelGroup.append('text')
                        .attr('class', 'sub-item-label')
                        .attr('text-anchor', isRightSide ? 'start' : 'end')
                        .text(labelText);

                    // Apply text styling based on spoke type
                    Object.keys(textStyle).forEach(key => {
                        spokeLabel.style(key, textStyle[key]);
                    });

                    // Add green pill for scheduled spokes (just the date/time portion)
                    ChartRenderer.addSchedulePill(labelGroup, spokeLabel, subItem, isRightSide);

                });
            });
        });

        // Back button when in expanded view
        if (this.expandedView) {
            const backBtn = this.svg.append('g')
                .attr('class', 'back-button')
                .attr('transform', `translate(0, ${-this.innerRadius - 70})`)
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    event.stopPropagation();
                    this.collapseToFullPie();
                });

            backBtn.append('circle')
                .attr('r', 18)
                .attr('fill', '#666')
                .attr('opacity', 0.8);

            backBtn.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('font-size', '18px')
                .style('fill', '#fff')
                .style('font-weight', 'bold')
                .text('\u2715');  // ✕ character
        }

        // Crossfade animation when transitioning between views
        if (this.expandedView || this._wasExpanded) {
            this.svg.style('opacity', 0)
                .transition().duration(300)
                .style('opacity', 1);
        }
        this._wasExpanded = !!this.expandedView;
    },

    collapseToFullPie() {
        this.expandedView = null;
        App.render();
    },
    expandBranch(spokeData, categoryData, itemData, spokeAngle, categoryId, itemId, spokeIndex) {
        // Auto-close existing branches unless debug mode allows multiple
        if (!Debug.isActive('allowMultipleBranches') && this.currentExpandedLocation) {
            this.collapseBranch();
        }

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

            // Push bottom branches up with rapid scaling near 6:00
            // testY: -1 at 12:00, 0 at 3:00/9:00, +1 at 6:00
            // Use power curve: kicks in around 4:00, peaks at 6:00, scales out by 8:00
            const yOffset = testY > 0 ? -35 * Math.pow(testY, 2) : 0;

            // Create branch visualization
            const branchGroup = that.highlightGroup.append('g')
                .attr('class', 'branch-view')
                .attr('transform', `translate(0, ${yOffset})`);

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
                const hasRecurrence = child.recurrence;
                const childDataLocation = { ...dataLocation, childIndex: idx };

                // Add calendar icon/button or scheduled time
                const iconGroup = branchGroup.append('g')
                    .attr('transform', `translate(${posX}, ${posY - 25})`)
                    .style('cursor', 'pointer')
                    .on('click', function(event) {
                        event.stopPropagation();
                        that.openCalendarForAction(child, spokeData, itemData.data.name, categoryData.data.name, childDataLocation);
                    });

                if (hasRecurrence) {
                    // Repeating action - show green pill with recurrence text
                    const recurrenceText = UI.formatRecurrenceDescriptionCompact(child.recurrence);
                    const textWidth = Math.max(90, recurrenceText.length * 7);

                    iconGroup.append('rect')
                        .attr('x', -textWidth / 2)
                        .attr('y', -12)
                        .attr('width', textWidth)
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
                        .text(recurrenceText);
                } else if (hasSchedule) {
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
                const isCompleted = child.completed || false;
                branchGroup.append('text')
                    .attr('x', posX)
                    .attr('y', posY - 5)
                    .attr('text-anchor', labelAnchor)
                    .style('font-size', '14px')
                    .style('fill', isCompleted ? '#999' : '#333')
                    .style('text-decoration', isCompleted ? 'line-through' : 'none')
                    .text((isCompleted ? '✓ ' : '') + (child.text || child))
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