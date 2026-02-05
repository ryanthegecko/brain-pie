const ChartRenderer = {
    svg: null,
    highlightGroup: null,
    viewMode: 'pie',  // 'pie' or 'tree'
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
                const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                const timeStr = spoke.scheduled.time ? this.formatCompactTime(spoke.scheduled.time) : '';
                return timeStr ? `${dateStr} ${timeStr}` : dateStr;
            }
            return null;  // Unscheduled single - icon only, no pill
        }

        if (type === 'repeating') {
            if (spoke.metadata && spoke.metadata.recurrence) {
                return this.formatRecurrencePillText(spoke.metadata.recurrence);
            }
            return null;  // Unset repeating - icon only, no pill
        }

        if (type === 'list') {
            const hasChildren = spoke.children && spoke.children.length > 0;
            if (hasChildren) {
                return `(${spoke.children.length})`;
            }
            return null;
        }

        return null;
    },

    // Get the scheduled date for a spoke (returns Date or null)
    getScheduledDate(spoke) {
        if (typeof spoke === 'string') return null;
        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';

        if (type === 'single' && spoke.scheduled && spoke.scheduled.date) {
            return new Date(`${spoke.scheduled.date}T${spoke.scheduled.time || '00:00'}`);
        }
        if (type === 'repeating' && spoke.metadata && spoke.metadata.recurrence) {
            const rec = spoke.metadata.recurrence;
            if (rec.startDate) return new Date(`${rec.startDate}T${rec.time || '00:00'}`);
        }
        return null;
    },

    // Check if a date is today (same calendar day)
    isToday(date) {
        const now = new Date();
        return date.getFullYear() === now.getFullYear() &&
               date.getMonth() === now.getMonth() &&
               date.getDate() === now.getDate();
    },

    // Check if a date is in the past (before today)
    isPast(date) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return date < todayStart;
    },

    // Check if a date is tomorrow
    isTomorrow(date) {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return date.getFullYear() === tomorrow.getFullYear() &&
               date.getMonth() === tomorrow.getMonth() &&
               date.getDate() === tomorrow.getDate();
    },

    // Get pill background color based on spoke state
    getSchedulePillColor(spoke) {
        if (typeof spoke === 'string') return null;

        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';

        const hasSchedule = spoke.scheduled && spoke.scheduled.date;
        const hasRecurrence = spoke.metadata && spoke.metadata.recurrence;

        if (type === 'single') {
            if (!hasSchedule) return '#2196F3';
            const date = this.getScheduledDate(spoke);
            if (date && this.isPast(date)) return '#FF9800';
            return '#4CAF50';
        }
        if (type === 'repeating') {
            return hasRecurrence ? '#4CAF50' : '#2196F3';
        }
        if (type === 'list') {
            return '#2196F3';
        }

        return null;
    },

    // Get the icon to render outside the pill (always shown for non-static types)
    getScheduleIcon(spoke) {
        if (typeof spoke === 'string') return null;

        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';

        if (type === 'single') return '📅';
        if (type === 'repeating') return '🔁';
        if (type === 'list') return '☑️';
        return null;
    },

    // Format time compactly: "09:00" → "9AM", "09:45" → "9:45AM", "13:00" → "1PM", "13:30" → "1:30PM"
    formatCompactTime(timeStr) {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        if (m === 0) return `${hour12}${period}`;
        return `${hour12}:${String(m).padStart(2, '0')}${period}`;
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
            parts.push(this.formatCompactTime(recurrence.time));
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

    // Add priority star before spoke name text element
    addPriorityStar(group, nameTextElement, isRightSide, spokeRef) {
        const priorityIdx = UI.getPriorityIndex(spokeRef);
        const isTop5 = priorityIdx >= 0 && priorityIdx < 5;
        const starSize = isTop5 ? 16 : 12;

        setTimeout(() => {
            try {
                const nameBbox = nameTextElement.node().getBBox();
                const gap = 4;
                const starX = isRightSide
                    ? nameBbox.x - gap
                    : nameBbox.x + nameBbox.width + gap;
                const starY = nameBbox.y + nameBbox.height - 2;

                group.append('text')
                    .attr('x', starX)
                    .attr('y', starY)
                    .attr('text-anchor', isRightSide ? 'end' : 'start')
                    .attr('font-size', starSize + 'px')
                    .attr('fill', '#FFD700')
                    .attr('stroke', '#B8960C')
                    .attr('stroke-width', 0.3)
                    .style('cursor', 'pointer')
                    .text('\u2605')
                    .on('click', (event) => {
                        event.stopPropagation();
                        UI.addToPriorities(spokeRef);
                    });
            } catch (e) {
                // Text element may not be in DOM yet
            }
        }, 10);
    },

    // Add schedule icon and pill after spoke name text element
    addSchedulePill(group, nameTextElement, spoke, isRightSide, fontSize = 12) {
        const icon = this.getScheduleIcon(spoke);
        const pillText = this.getSchedulePillText(spoke);
        if (!icon && !pillText) return;

        const pillColor = this.getSchedulePillColor(spoke) || '#4CAF50';
        const scheduledDate = this.getScheduledDate(spoke);
        const isTodayEvent = scheduledDate && this.isToday(scheduledDate);
        const isTomorrowEvent = scheduledDate && this.isTomorrow(scheduledDate);
        const iconSize = 14;

        // Get name text bounding box after brief delay
        setTimeout(() => {
            try {
                const nameBbox = nameTextElement.node().getBBox();
                const padding = { x: 6, y: 3 };
                const gap = 8;

                const pillGroup = group.append('g').attr('class', 'schedule-pill');
                let cursorX;

                if (isRightSide) {
                    cursorX = nameBbox.x + nameBbox.width + gap;
                } else {
                    cursorX = nameBbox.x - gap;
                }

                const textY = nameBbox.y + nameBbox.height - 2;

                // Render icon outside the pill
                if (icon) {
                    const iconEl = pillGroup.append('text')
                        .attr('font-size', iconSize + 'px')
                        .attr('text-anchor', isRightSide ? 'start' : 'end')
                        .attr('x', cursorX)
                        .attr('y', textY)
                        .text(icon);

                    const iconBbox = iconEl.node().getBBox();
                    if (isRightSide) {
                        cursorX = iconBbox.x + iconBbox.width + 8;
                    } else {
                        cursorX = iconBbox.x - 8;
                    }
                }

                // Render pill with text (if there's text beyond just the icon)
                if (pillText) {
                    const pillTextEl = pillGroup.append('text')
                        .attr('font-size', fontSize + 'px')
                        .attr('fill', '#ffffff')
                        .attr('text-anchor', isRightSide ? 'start' : 'end')
                        .attr('x', cursorX)
                        .attr('y', textY)
                        .text(pillText);

                    const pillTextBbox = pillTextEl.node().getBBox();
                    const rect = pillGroup.insert('rect', 'text:last-of-type')
                        .attr('x', pillTextBbox.x - padding.x)
                        .attr('y', pillTextBbox.y - padding.y)
                        .attr('width', pillTextBbox.width + padding.x * 2)
                        .attr('height', pillTextBbox.height + padding.y * 2)
                        .attr('rx', 10)
                        .attr('ry', 10)
                        .attr('fill', pillColor);

                    // Borders: orange today, black tomorrow, white otherwise
                    if (isTodayEvent) {
                        rect.attr('stroke', '#FF9800')
                            .attr('stroke-width', 2);
                    } else if (isTomorrowEvent) {
                        rect.attr('stroke', '#000000')
                            .attr('stroke-width', 2);
                    } else {
                        rect.attr('stroke', '#ffffff')
                            .attr('stroke-width', 1.5);
                    }
                }

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

            // Show action popup near click
            const sliceName = sliceData.data ? sliceData.data.name : '';
            const categoryName = catData.data ? catData.data.name : '';
            ChartRenderer.showActionPopup(event, subItem, categoryName, sliceName, categoryId, itemId, spokeIndex);
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

        // Get actual container dimensions
        const containerNode = document.getElementById(containerId);
        const actualWidth = containerNode.clientWidth;
        const actualHeight = Math.max(containerNode.clientHeight, 660);

        if (this.viewMode === 'tree') {
            // Treemap: use actual dimensions, no scaling
            this.width = actualWidth;
            this.height = actualHeight;
            const minDimension = Math.min(this.width, this.height);
            this.outerRadius = Math.min(actualWidth <= 1024 ? 350 : 550, minDimension * 0.33);
            this.baseOuterRadius = this.outerRadius;
            this.innerRadius = this.outerRadius - 40;
            this.baseCategoryRingWidth = this.outerRadius - this.innerRadius;

            this.svg = container.append('svg')
                .attr('width', this.width)
                .attr('height', this.height)
                .append('g');
        } else if (actualWidth >= 1920) {
            // Pie: large screens — render at actual size, no scaling needed
            this.width = actualWidth;
            this.height = actualHeight;
            const minDimension = Math.min(this.width, this.height);
            this.outerRadius = Math.min(550, minDimension * 0.33);
            this.baseOuterRadius = this.outerRadius;
            this.innerRadius = this.outerRadius - 40;
            this.baseCategoryRingWidth = this.outerRadius - this.innerRadius;

            this.svg = container.append('svg')
                .attr('width', this.width)
                .attr('height', this.height)
                .append('g')
                .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
        } else {
            // Pie: smaller screens — render at 1920px virtual canvas, scale down via viewBox
            const virtualWidth = 1920;
            const virtualHeight = Math.round(actualHeight * (virtualWidth / actualWidth));
            this.width = virtualWidth;
            this.height = virtualHeight;

            const minDimension = Math.min(virtualWidth, virtualHeight);
            this.outerRadius = Math.min(550, minDimension * 0.33);
            this.baseOuterRadius = this.outerRadius;
            this.innerRadius = this.outerRadius - 40;
            this.baseCategoryRingWidth = this.outerRadius - this.innerRadius;

            this.svg = container.append('svg')
                .attr('width', actualWidth)
                .attr('height', actualHeight)
                .attr('viewBox', `0 0 ${virtualWidth} ${virtualHeight}`)
                .append('g')
                .attr('transform', `translate(${virtualWidth / 2}, ${virtualHeight / 2})`);
        }

        // Create a group for highlighted/expanded slices (drawn on top)
        this.highlightGroup = this.svg.append('g').attr('class', 'highlight-layer');
    },

    // Lighten a hex color by a factor (0-1)
    lightenColor(hexColor, factor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const nr = Math.min(255, Math.round(r + (255 - r) * factor));
        const ng = Math.min(255, Math.round(g + (255 - g) * factor));
        const nb = Math.min(255, Math.round(b + (255 - b) * factor));
        return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
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

        if (this.viewMode === 'tree') {
            this.renderTreemap(categories);
        } else {
            this.renderPie(categories);
        }
    },

    renderPie(categories) {
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

        // Restore base radius (in case expanded view changed it)
        this.outerRadius = this.baseOuterRadius;
        this.innerRadius = this.outerRadius - this.baseCategoryRingWidth;

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

        categorySlices
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget).select('path')
                    .transition().duration(200)
                    .attr('fill', ChartRenderer.lightenColor(d.data.color, 0.25));
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget).select('path')
                    .transition().duration(200)
                    .attr('fill', d.data.color);
            });

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

            itemSlices
                .on('mouseover', (event, d) => {
                    d3.select(event.currentTarget).select('path')
                        .transition().duration(200)
                        .attr('fill', ChartRenderer.lightenColor(d.data.color, 0.2));
                })
                .on('mouseout', (event, d) => {
                    d3.select(event.currentTarget).select('path')
                        .transition().duration(200)
                        .attr('fill', d.data.color);
                });

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
                    const outerEdgeX = Math.cos(renderAngle) * this.outerRadius;
                    const outerEdgeY = Math.sin(renderAngle) * this.outerRadius;

                    // Draw line from outer ring edge to label position
                    group.append('line')
                        .attr('class', 'sub-item-line')
                        .attr('x1', outerEdgeX)
                        .attr('y1', outerEdgeY)
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
                    const spokeRef = { type: 'spoke', categoryId: catData.data.id, itemId: d.data.id, spokeIndex: idx };
                    const isPriority = UI.isPrioritised(spokeRef);

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

                    // Add priority star before spoke name
                    if (isPriority) {
                        ChartRenderer.addPriorityStar(labelGroup, spokeLabel, isRightSide, spokeRef);
                    }

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
                .style('opacity', 1)
                .on('end', () => { this.svg.style('opacity', null); });
        }
        this._wasExpanded = !!this.expandedView;
    },

    renderTreemap(categories) {
        this.svg.selectAll('*').remove();
        this.highlightGroup = this.svg.append('g').attr('class', 'highlight-layer');

        const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

        if (totalItems === 0) {
            this.svg.append('text')
                .attr('x', this.width / 2)
                .attr('y', this.height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', '#999')
                .attr('font-size', '16px')
                .text('Add items to see your brain tree');
            return;
        }

        // Calculate category percentages (same as renderPie)
        let categoryData = categories.map(cat => ({
            ...cat,
            percentage: DataModel.getCategoryPercentage(cat.id)
        })).filter(cat => cat.items.length > 0);

        // Handle expanded view
        if (this.expandedView) {
            const ev = this.expandedView;
            if (ev.type === 'slice') {
                const parentCat = categoryData.find(c => c.id === ev.categoryId);
                const targetSlice = parentCat && parentCat.items.find(item => item.id === ev.itemId);
                if (parentCat && targetSlice) {
                    categoryData = [{
                        ...parentCat,
                        percentage: 100,
                        items: [{ ...targetSlice, percentage: 100 }]
                    }];
                } else {
                    this.expandedView = null;
                }
            } else if (ev.type === 'category') {
                const targetCat = categoryData.find(c => c.id === ev.categoryId);
                if (targetCat) {
                    categoryData = [{ ...targetCat, percentage: 100 }];
                } else {
                    this.expandedView = null;
                }
            }
        }

        // Build d3 hierarchy
        const hierarchyData = {
            name: 'root',
            children: categoryData.map(cat => ({
                name: cat.name,
                color: cat.color,
                id: cat.id,
                categoryRef: cat,
                children: cat.items.map(item => ({
                    name: item.name,
                    color: item.color,
                    id: item.id,
                    categoryId: cat.id,
                    itemRef: item,
                    value: Math.max(1, (item.percentage / 100) * cat.percentage),
                    subItems: item.subItems || []
                }))
            }))
        };

        const margin = { top: 8, right: 8, bottom: 8, left: 8 };
        const treemapWidth = this.width - margin.left - margin.right;
        const treemapHeight = this.height - margin.top - margin.bottom;

        const root = d3.hierarchy(hierarchyData)
            .sum(d => d.value || 0)
            .sort((a, b) => b.value - a.value);

        d3.treemap()
            .size([treemapWidth, treemapHeight])
            .paddingTop(26)
            .paddingRight(3)
            .paddingBottom(3)
            .paddingLeft(3)
            .paddingInner(3)
            .round(true)
            (root);

        const treemapG = this.svg.append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // --- Level 1: Category groups ---
        const categoryNodes = root.children || [];

        categoryNodes.forEach(catNode => {
            const catW = catNode.x1 - catNode.x0;
            const catH = catNode.y1 - catNode.y0;
            if (catW < 2 || catH < 2) return;

            const catGroup = treemapG.append('g')
                .attr('class', 'treemap-category')
                .attr('transform', `translate(${catNode.x0}, ${catNode.y0})`);

            // Category background
            catGroup.append('rect')
                .attr('width', catW)
                .attr('height', catH)
                .attr('fill', catNode.data.color)
                .attr('opacity', 0.2)
                .attr('rx', 6)
                .attr('stroke', catNode.data.color)
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    event.stopPropagation();
                    if (this.collapseIfBranchExpanded()) return;
                    if (this.expandedView) {
                        this.collapseToFullPie();
                    } else {
                        this.expandedView = { type: 'category', categoryId: catNode.data.id };
                        App.render();
                    }
                });

            // Category header label
            const catTextColor = this.isColorDark(catNode.data.color) ? '#ffffff' : '#333333';
            const maxCatChars = Math.floor((catW - 12) / 8);
            const catLabel = catNode.data.name.length > maxCatChars
                ? catNode.data.name.substring(0, Math.max(3, maxCatChars - 1)) + '...'
                : catNode.data.name;

            catGroup.append('text')
                .attr('x', 6)
                .attr('y', 17)
                .attr('font-size', '13px')
                .attr('font-weight', 'bold')
                .attr('fill', catTextColor)
                .text(catLabel)
                .style('pointer-events', 'none');

            // --- Level 2: Slice cells within category ---
            if (!catNode.children) return;

            catNode.children.forEach(sliceNode => {
                const sliceW = sliceNode.x1 - sliceNode.x0;
                const sliceH = sliceNode.y1 - sliceNode.y0;
                if (sliceW < 2 || sliceH < 2) return;

                const sliceGroup = treemapG.append('g')
                    .attr('class', 'treemap-slice')
                    .attr('transform', `translate(${sliceNode.x0}, ${sliceNode.y0})`);

                // Slice rectangle
                sliceGroup.append('rect')
                    .attr('width', sliceW)
                    .attr('height', sliceH)
                    .attr('fill', sliceNode.data.color)
                    .attr('opacity', 0.85)
                    .attr('rx', 4)
                    .style('cursor', 'pointer')
                    .on('click', (event) => {
                        event.stopPropagation();
                        if (this.collapseIfBranchExpanded()) return;
                        if (this.expandedView && this.expandedView.type === 'slice') {
                            this.collapseToFullPie();
                        } else {
                            this.expandedView = {
                                type: 'slice',
                                categoryId: sliceNode.data.categoryId,
                                itemId: sliceNode.data.id
                            };
                            App.render();
                        }
                    });

                // Slice header label
                const sliceTextColor = this.isColorDark(sliceNode.data.color) ? '#ffffff' : '#222222';
                const maxSliceChars = Math.floor((sliceW - 8) / 8.5);
                const sliceLabel = sliceNode.data.name.length > maxSliceChars
                    ? sliceNode.data.name.substring(0, Math.max(3, maxSliceChars - 1)) + '...'
                    : sliceNode.data.name;

                sliceGroup.append('text')
                    .attr('x', 4)
                    .attr('y', 18)
                    .attr('font-size', '14px')
                    .attr('font-weight', 'bold')
                    .attr('fill', sliceTextColor)
                    .text(sliceLabel)
                    .style('pointer-events', 'none');

                // --- Level 3: Spokes as wrapped text rows ---
                const subItems = sliceNode.data.subItems || [];
                const spokeStartY = 30;
                const lineHeight = 13;
                const spokePadding = 3;  // Extra gap between spokes
                const charWidth = 5.8;   // Approx width per char at 10px font
                const maxY = sliceH - 4;
                const categoryId = sliceNode.data.categoryId;
                const itemId = sliceNode.data.id;

                let cursorY = spokeStartY;

                for (let idx = 0; idx < subItems.length; idx++) {
                    if (cursorY >= maxY) {
                        // Show overflow count
                        const remaining = subItems.length - idx;
                        if (remaining > 0) {
                            sliceGroup.append('text')
                                .attr('class', 'treemap-spoke-group')
                                .attr('x', 5)
                                .attr('y', cursorY)
                                .attr('font-size', '9px')
                                .attr('fill', sliceTextColor)
                                .attr('opacity', 0.6)
                                .text(`+${remaining} more`);
                        }
                        break;
                    }

                    const subItem = subItems[idx];
                    const spokeName = typeof subItem === 'string' ? subItem : subItem.text;
                    const icon = this.getScheduleIcon(subItem);
                    const textStyle = this.getSpokeTextStyle(subItem);
                    const pillText = this.getSchedulePillText(subItem);
                    const pillColor = this.getSchedulePillColor(subItem);
                    const scheduledDate = this.getScheduledDate(subItem);
                    const isTodayEvent = scheduledDate && this.isToday(scheduledDate);
                    const isTomorrowEvent = scheduledDate && this.isTomorrow(scheduledDate);
                    const treeSpokeRef = { type: 'spoke', categoryId, itemId, spokeIndex: idx };
                    const isTreePriority = UI.isPrioritised(treeSpokeRef);

                    const starOffset = isTreePriority ? 12 : 0;
                    const textStartX = (icon ? 20 : 5) + starOffset;
                    const textAvailableW = sliceW - textStartX - 6;
                    const charsPerLine = Math.max(4, Math.floor(textAvailableW / charWidth));

                    // Word-wrap the spoke name
                    const words = spokeName.split(' ');
                    const lines = [];
                    let currentLine = '';
                    for (const word of words) {
                        const test = currentLine ? currentLine + ' ' + word : word;
                        if (test.length > charsPerLine && currentLine) {
                            lines.push(currentLine);
                            currentLine = word;
                        } else {
                            currentLine = test;
                        }
                    }
                    if (currentLine) lines.push(currentLine);

                    // Check if this spoke fits
                    const spokeHeight = lines.length * lineHeight + spokePadding;
                    if (cursorY + spokeHeight > maxY + lineHeight) {
                        // Only show if at least first line fits
                        if (cursorY + lineHeight > maxY) {
                            const remaining = subItems.length - idx;
                            if (remaining > 0) {
                                sliceGroup.append('text')
                                    .attr('class', 'treemap-spoke-group')
                                    .attr('x', 5)
                                    .attr('y', cursorY)
                                    .attr('font-size', '9px')
                                    .attr('fill', sliceTextColor)
                                    .attr('opacity', 0.6)
                                    .text(`+${remaining} more`);
                            }
                            break;
                        }
                    }

                    // Clickable spoke group
                    const spokeGroup = sliceGroup.append('g')
                        .attr('class', 'treemap-spoke-group')
                        .style('cursor', 'pointer')
                        .on('click', (event) => {
                            event.stopPropagation();
                            this.handleSpokeClick(
                                event, subItem,
                                { data: catNode.data.categoryRef },
                                { data: sliceNode.data.itemRef, startAngle: 0, endAngle: 0 },
                                idx, categoryId, itemId
                            );
                        });

                    // Priority star on first line
                    if (isTreePriority) {
                        const treeStarIdx = UI.getPriorityIndex(treeSpokeRef);
                        const treeStarSize = (treeStarIdx >= 0 && treeStarIdx < 5) ? 14 : 10;
                        spokeGroup.append('text')
                            .attr('x', 5)
                            .attr('y', cursorY)
                            .attr('font-size', treeStarSize + 'px')
                            .attr('fill', '#FFD700')
                            .attr('stroke', '#B8960C')
                            .attr('stroke-width', 0.3)
                            .style('cursor', 'pointer')
                            .text('\u2605')
                            .on('click', (event) => {
                                event.stopPropagation();
                                UI.addToPriorities(treeSpokeRef);
                            });
                    }

                    // Icon on first line
                    if (icon) {
                        spokeGroup.append('text')
                            .attr('x', 5 + starOffset)
                            .attr('y', cursorY)
                            .attr('font-size', '10px')
                            .text(icon);
                    }

                    // Wrapped text lines
                    const nameEl = spokeGroup.append('text')
                        .attr('x', textStartX)
                        .attr('y', cursorY)
                        .attr('font-size', '10px')
                        .attr('fill', sliceTextColor);

                    Object.keys(textStyle).forEach(key => {
                        nameEl.style(key, textStyle[key]);
                    });

                    lines.forEach((line, lineIdx) => {
                        if (lineIdx === 0) {
                            nameEl.text(line);
                        } else {
                            nameEl.append('tspan')
                                .attr('x', textStartX)
                                .attr('dy', lineHeight)
                                .text(line);
                        }
                    });

                    const lastLineY = cursorY + (lines.length - 1) * lineHeight;

                    // Inline schedule pill on last line
                    if (pillText && pillColor) {
                        setTimeout(() => {
                            try {
                                const lastLineWidth = lines[lines.length - 1].length * charWidth;
                                const pillX = textStartX + lastLineWidth + 4;
                                const pillPadX = 5;
                                const pillPadY = 2;

                                const pillTextEl = spokeGroup.append('text')
                                    .attr('x', pillX + pillPadX)
                                    .attr('y', lastLineY)
                                    .attr('font-size', '8px')
                                    .attr('fill', '#ffffff')
                                    .attr('font-weight', 'bold')
                                    .text(pillText);

                                const pillBbox = pillTextEl.node().getBBox();
                                const rect = spokeGroup.insert('rect', 'text:last-of-type')
                                    .attr('x', pillBbox.x - pillPadX)
                                    .attr('y', pillBbox.y - pillPadY)
                                    .attr('width', Math.min(pillBbox.width + pillPadX * 2, sliceW - pillX - 4))
                                    .attr('height', pillBbox.height + pillPadY * 2)
                                    .attr('rx', 6)
                                    .attr('fill', pillColor);

                                if (isTodayEvent) {
                                    rect.attr('stroke', '#FF9800').attr('stroke-width', 1.5);
                                } else if (isTomorrowEvent) {
                                    rect.attr('stroke', '#000000').attr('stroke-width', 1.5);
                                } else {
                                    rect.attr('stroke', '#ffffff').attr('stroke-width', 1.5);
                                }
                            } catch (e) { /* element may not be in DOM */ }
                        }, 10);
                    }

                    cursorY += spokeHeight;
                }
            });
        });

        // Back button when expanded
        if (this.expandedView) {
            const backBtn = treemapG.append('g')
                .attr('class', 'back-button')
                .attr('transform', `translate(${treemapWidth - 25}, 13)`)
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    event.stopPropagation();
                    this.collapseToFullPie();
                });

            backBtn.append('circle')
                .attr('r', 14)
                .attr('fill', '#666')
                .attr('opacity', 0.8);

            backBtn.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('font-size', '14px')
                .style('fill', '#fff')
                .style('font-weight', 'bold')
                .text('\u2715');
        }

        // Crossfade animation
        if (this.expandedView || this._wasExpanded) {
            this.svg.style('opacity', 0)
                .transition().duration(300)
                .style('opacity', 1)
                .on('end', () => { this.svg.style('opacity', null); });
        }
        this._wasExpanded = !!this.expandedView;
    },

    collapseToFullPie() {
        // Close any open branch and clean up its state
        if (this.currentExpandedLocation) {
            this.currentExpandedLocation = null;
            this.highlightGroup.selectAll('*').remove();
            if (this.branchClickOutsideHandler) {
                document.removeEventListener('click', this.branchClickOutsideHandler);
                this.branchClickOutsideHandler = null;
            }
        }
        this.expandedView = null;
        App.render();
    },
    showActionPopup(event, spokeData, categoryName, sliceName, categoryId, itemId, spokeIndex) {
        if (!Debug.isActive('allowMultipleBranches') && this.currentExpandedLocation) {
            this.collapseBranch();
        }

        this.currentExpandedLocation = { categoryId, itemId, spokeIndex };
        const that = this;
        const dataLocation = { categoryId, itemId, spokeIndex };
        const children = spokeData.children || [];
        if (children.length === 0) return;

        const spokeName = spokeData.text || spokeData;

        // Convert click position to SVG coordinates (or center if no event)
        let clickSvgX, clickSvgY;
        if (event && event.clientX != null) {
            const svgNode = this.svg.node().ownerSVGElement || this.svg.node();
            const svgRect = svgNode.getBoundingClientRect();
            clickSvgX = event.clientX - svgRect.left;
            clickSvgY = event.clientY - svgRect.top;
            if (this.viewMode === 'pie') {
                clickSvgX -= this.width / 2;
                clickSvgY -= this.height / 2;
            }
        } else {
            // Programmatic open: center of SVG
            clickSvgX = this.viewMode === 'pie' ? 0 : this.width / 2;
            clickSvgY = this.viewMode === 'pie' ? 0 : this.height / 2;
        }

        // Card dimensions
        const rowHeight = 32;
        const cardPadding = 12;
        const headerHeight = 32;
        const cardWidth = Math.min(320, this.width - 40);
        const cardHeight = Math.min(headerHeight + children.length * rowHeight + cardPadding, this.height - 40);

        // Position near click, clamped within SVG bounds
        let minX, maxX, minY, maxY;
        if (this.viewMode === 'pie') {
            minX = -this.width / 2 + 10;
            maxX = this.width / 2 - cardWidth - 10;
            minY = -this.height / 2 + 10;
            maxY = this.height / 2 - cardHeight - 10;
        } else {
            minX = 10;
            maxX = this.width - cardWidth - 10;
            minY = 10;
            maxY = this.height - cardHeight - 10;
        }
        const cardX = Math.max(minX, Math.min(maxX, clickSvgX - cardWidth / 2));
        const cardY = Math.max(minY, Math.min(maxY, clickSvgY + 15));

        const branchGroup = this.highlightGroup.append('g')
            .attr('class', 'branch-view action-popup');

        // Dimmer behind card (accounts for coordinate system)
        const dimmerX = this.viewMode === 'pie' ? -this.width / 2 : 0;
        const dimmerY = this.viewMode === 'pie' ? -this.height / 2 : 0;
        branchGroup.append('rect')
            .attr('x', dimmerX)
            .attr('y', dimmerY)
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', 'transparent')
            .attr('opacity', 0)
            .style('cursor', 'default')
            .on('click', (event) => {
                event.stopPropagation();
                this.collapseBranch();
            });

        // Card background
        branchGroup.append('rect')
            .attr('x', cardX)
            .attr('y', cardY)
            .attr('width', cardWidth)
            .attr('height', cardHeight)
            .attr('rx', 8)
            .attr('fill', '#ffffff')
            .attr('stroke', '#ddd')
            .attr('stroke-width', 1);

        // Card header
        branchGroup.append('text')
            .attr('x', cardX + cardPadding)
            .attr('y', cardY + 22)
            .attr('font-size', '13px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text(spokeName);

        // Close button
        const closeBtn = branchGroup.append('g')
            .attr('transform', `translate(${cardX + cardWidth - 18}, ${cardY + 18})`)
            .style('cursor', 'pointer')
            .on('click', (event) => {
                event.stopPropagation();
                this.collapseBranch();
            });
        closeBtn.append('circle')
            .attr('r', 11)
            .attr('fill', '#e0e0e0');
        closeBtn.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', '#666')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text('\u2715');

        // Action rows: checkbox | title | calendar/schedule | star | trash
        children.forEach((child, idx) => {
            const rowY = cardY + headerHeight + idx * rowHeight;
            const childText = child.text || child;
            const hasSchedule = child.scheduled && child.scheduled.date;
            const isCompleted = child.completed || false;
            const childDataLocation = { ...dataLocation, childIndex: idx };
            const rightEdge = cardX + cardWidth - cardPadding;
            let cursorX = cardX + cardPadding;

            const rowGroup = branchGroup.append('g');

            // Row background for hover
            rowGroup.append('rect')
                .attr('x', cardX + 2)
                .attr('y', rowY - 2)
                .attr('width', cardWidth - 4)
                .attr('height', rowHeight)
                .attr('fill', 'transparent')
                .attr('rx', 4);

            // 1) Checkbox
            const checkSize = 14;
            const checkX = cursorX;
            const checkY = rowY + (rowHeight - checkSize) / 2 - 2;
            const checkGroup = rowGroup.append('g')
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    event.stopPropagation();
                    UI.toggleActionCompleted(categoryId, itemId, spokeIndex, idx);
                    that.collapseBranch();
                });
            checkGroup.append('rect')
                .attr('x', checkX)
                .attr('y', checkY)
                .attr('width', checkSize)
                .attr('height', checkSize)
                .attr('rx', 2)
                .attr('fill', isCompleted ? '#4CAF50' : '#fff')
                .attr('stroke', isCompleted ? '#4CAF50' : '#ccc')
                .attr('stroke-width', 1.5);
            if (isCompleted) {
                checkGroup.append('text')
                    .attr('x', checkX + checkSize / 2)
                    .attr('y', checkY + checkSize / 2 + 1)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'central')
                    .attr('font-size', '10px')
                    .attr('fill', '#fff')
                    .attr('font-weight', 'bold')
                    .text('\u2713');
            }
            cursorX += checkSize + 8;

            // 2) Title
            rowGroup.append('text')
                .attr('x', cursorX)
                .attr('y', rowY + 14)
                .attr('font-size', '11px')
                .attr('fill', isCompleted ? '#999' : '#333')
                .style('text-decoration', isCompleted ? 'line-through' : 'none')
                .text(childText);

            // Right-side buttons (laid out right-to-left)
            let btnX = rightEdge;

            // 5) Trash icon (rightmost)
            btnX -= 14;
            const trashGroup = rowGroup.append('g')
                .attr('transform', `translate(${btnX}, ${rowY + 6})`)
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    event.stopPropagation();
                    App.removeSpokeChild(categoryId, itemId, spokeIndex, idx);
                    that.collapseBranch();
                });
            trashGroup.append('rect')
                .attr('x', -4).attr('y', -2)
                .attr('width', 18).attr('height', 18)
                .attr('fill', '#ffeaea').attr('rx', 3);
            trashGroup.append('text')
                .attr('x', 5).attr('y', 11)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('fill', '#f44336')
                .text('\uD83D\uDDD1');
            btnX -= 10;

            // 4) Star for prioritiser
            btnX -= 14;
            const isPrioritised = UI.isPrioritised({ type: 'action', categoryId, itemId, spokeIndex, childIndex: idx });
            const starGroup = rowGroup.append('g')
                .attr('transform', `translate(${btnX}, ${rowY + 6})`)
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    event.stopPropagation();
                    const ref = { type: 'action', categoryId, itemId, spokeIndex, childIndex: idx };
                    DataModel.addPriority(ref);
                    UI.renderPriorityList();
                    starGroup.select('text').attr('fill', UI.isPrioritised(ref) ? '#FFD700' : '#ccc');
                });
            starGroup.append('text')
                .attr('x', 5).attr('y', 12)
                .attr('text-anchor', 'middle')
                .attr('font-size', '14px')
                .attr('fill', isPrioritised ? '#FFD700' : '#ccc')
                .text('\u2733');
            btnX -= 8;

            // 3) Calendar icon / schedule pill
            const calGroup = rowGroup.append('g')
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    event.stopPropagation();
                    that.openCalendarForAction(child, spokeData, sliceName, categoryName, childDataLocation);
                });

            if (hasSchedule) {
                const schedDate = new Date(`${child.scheduled.date}T${child.scheduled.time || '00:00'}`);
                const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                const timeStr = child.scheduled.time ? that.formatCompactTime(child.scheduled.time) : '';
                const pillLabel = `${dateStr}${timeStr ? ' ' + timeStr : ''}`;
                const pillW = pillLabel.length * 7 + 12;
                btnX -= pillW;
                calGroup.append('rect')
                    .attr('x', btnX)
                    .attr('y', rowY + 2)
                    .attr('width', pillW)
                    .attr('height', 20)
                    .attr('rx', 10)
                    .attr('fill', '#4CAF50');
                calGroup.append('text')
                    .attr('x', btnX + pillW / 2)
                    .attr('y', rowY + 15)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '9px')
                    .attr('fill', '#fff')
                    .attr('font-weight', 'bold')
                    .text(pillLabel);
            } else {
                btnX -= 20;
                calGroup.append('text')
                    .attr('x', btnX + 10)
                    .attr('y', rowY + 15)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '16px')
                    .attr('fill', '#4285F4')
                    .text('\uD83D\uDCC5');
            }
        });

        this.highlightGroup.raise();

        // Document-level click handler for clicks outside SVG
        setTimeout(() => {
            that.branchClickOutsideHandler = function(event) {
                const popup = document.querySelector('.action-popup');
                if (popup && popup.contains(event.target)) return;
                that.collapseBranch();
            };
            document.addEventListener('click', that.branchClickOutsideHandler);
        }, 50);
    },

    collapseBranch() {
        this.currentExpandedLocation = null;
        this.highlightGroup.selectAll('*').remove();

        if (this.branchClickOutsideHandler) {
            document.removeEventListener('click', this.branchClickOutsideHandler);
            this.branchClickOutsideHandler = null;
        }
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