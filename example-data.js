const ExampleData = {
    get() {
        // Returns a date string offset by N days from today (negative = past)
        const d = (offsetDays) => {
            const date = new Date();
            date.setDate(date.getDate() + offsetDays);
            return date.toISOString().slice(0, 10);
        };

        // Returns the date string for the next occurrence of a weekday (0=Sun … 6=Sat),
        // always at least 1 day ahead. Pass extraWeeks to offset by additional full weeks.
        const nextWeekday = (dow, extraWeeks = 0) => {
            const date = new Date();
            const daysUntil = (dow - date.getDay() + 7) % 7 || 7;
            date.setDate(date.getDate() + daysUntil + extraWeeks * 7);
            return date.toISOString().slice(0, 10);
        };

        return {
            categories: [
                {
                    "id": "home",
                    "name": "Home",
                    "color": "#4ECDC4",
                    "items": [
                        {
                            "id": "1",
                            "name": "Kitchen",
                            "percentage": 33.33,
                            "color": "#2196F3",
                            "subItems": [
                                { text: "Empty dishwasher", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Deep clean fridge", type: "list", children: [
                                    { text: "Clear out expired food", children: [], completed: true },
                                    { text: "Remove shelves and drawers", children: [], completed: false },
                                    { text: "Scrub interior with baking soda", children: [], completed: false },
                                    { text: "Reorganize by shelf zone", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Organize cupboards", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "2",
                            "name": "Laundry",
                            "percentage": 33.33,
                            "color": "#00BCD4",
                            "subItems": [
                                { text: "Sort clothes", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Wash darks", type: "repeating", children: [], scheduled: null, metadata: { recurrence: { frequency: "WEEKLY", interval: 2, byDay: ["TH"], time: "10:00", duration: 60, allDay: false, endType: "never", startDate: nextWeekday(4) } } },
                                { text: "Wash lights", type: "repeating", children: [], scheduled: null, metadata: { recurrence: { frequency: "WEEKLY", interval: 2, byDay: ["TH"], time: "10:00", duration: 60, allDay: false, endType: "never", startDate: nextWeekday(4, 1) } } },
                                { text: "Fold and put away", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "3",
                            "name": "Garden",
                            "percentage": 33.33,
                            "color": "#4CAF50",
                            "subItems": [
                                { text: "Water plants", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Spring planting", type: "list", children: [
                                    { text: "Buy seeds and compost", children: [], completed: true },
                                    { text: "Prepare raised beds", children: [], completed: false },
                                    { text: "Plant seedlings", children: [], completed: false, scheduled: { date: d(3), time: "10:00", duration: 120 } },
                                    { text: "Set up watering timer", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Trim hedges", type: "single", children: [], scheduled: { date: d(1), time: "09:00", duration: 120 }, metadata: {} },
                                { text: "Cut grass", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        }
                    ]
                },
                {
                    "id": "health",
                    "name": "Health",
                    "color": "#FF6B6B",
                    "items": [
                        {
                            "id": "4",
                            "name": "Exercise",
                            "percentage": 25,
                            "color": "#f05252",
                            "subItems": [
                                { text: "Morning jog", type: "repeating", children: [], scheduled: null, metadata: { recurrence: { frequency: "WEEKLY", interval: 1, byDay: ["MO","WE","FR"], time: "07:00", duration: 45, allDay: false, endType: "never" } } },
                                { text: "Stretching routine", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Sign up for 10K run", type: "single", children: [], scheduled: { date: d(4), time: "08:30", duration: 60 }, metadata: {} }
                            ]
                        },
                        {
                            "id": "5",
                            "name": "Meal Prep",
                            "percentage": 25,
                            "color": "#E91E63",
                            "subItems": [
                                { text: "Sunday batch cook", type: "list", children: [
                                    { text: "Check freezer stock", children: [], completed: true },
                                    { text: "Browse recipes for the week", children: [], completed: true },
                                    { text: "Write shopping list", children: [], completed: false },
                                    { text: "Do the food shop", children: [], completed: false },
                                    { text: "Prep vegetables", children: [], completed: false },
                                    { text: "Cook and portion meals", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Restock spice rack", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "6",
                            "name": "Medical",
                            "percentage": 25,
                            "color": "#9C27B0",
                            "subItems": [
                                { text: "Annual checkup", type: "single", children: [], scheduled: { date: d(14), time: "10:30", duration: 60 }, metadata: {} },
                                { text: "Eye test", type: "single", children: [], scheduled: { date: d(30), time: "14:00", duration: 45 }, metadata: {} },
                                { text: "Pick up prescription", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "7",
                            "name": "Sleep",
                            "percentage": 25,
                            "color": "#673AB7",
                            "subItems": [
                                { text: "Screens off by 10pm", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        }
                    ]
                },
                {
                    "id": "learning",
                    "name": "Learning",
                    "color": "#FFA726",
                    "items": [
                        {
                            "id": "8",
                            "name": "Language Study",
                            "percentage": 33.33,
                            "color": "#E07800",
                            "subItems": [
                                { text: "Daily vocabulary", type: "repeating", children: [], scheduled: null, metadata: { recurrence: { frequency: "DAILY", interval: 1, time: "08:00", duration: 15, allDay: false, endType: "never" } } },
                                { text: "Practice conversation", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Grammar exercises", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Watch foreign film", type: "single", children: [], scheduled: { date: d(-3), time: "20:00", duration: 120 }, metadata: {} }
                            ]
                        },
                        {
                            "id": "9",
                            "name": "Reading",
                            "percentage": 33.33,
                            "color": "#FF5722",
                            "subItems": [
                                { text: "Finish current book", type: "list", children: [
                                    { text: "Read chapters 8-12", children: [], completed: true },
                                    { text: "Read chapters 13-18", children: [], completed: false },
                                    { text: "Take notes on key themes", children: [], completed: false },
                                    { text: "Write short review", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Book club discussion", type: "single", children: [], scheduled: { date: d(0), time: "18:30", duration: 90 }, metadata: {} }
                            ]
                        },
                        {
                            "id": "10",
                            "name": "Online Course",
                            "percentage": 33.33,
                            "color": "#795548",
                            "subItems": [
                                { text: "Complete module 4", type: "list", children: [
                                    { text: "Watch lecture videos", children: [], completed: true },
                                    { text: "Do practice exercises", children: [], completed: true },
                                    { text: "Submit assignment", children: [], completed: false, scheduled: { date: d(-1), time: "17:00", duration: 60 } },
                                    { text: "Review feedback", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Final exam", type: "single", children: [], scheduled: { date: d(60), time: "09:00", duration: 180 }, metadata: {} }
                            ]
                        }
                    ]
                },
                {
                    "id": "social",
                    "name": "Social",
                    "color": "#AB90DB",
                    "items": [
                        {
                            "id": "11",
                            "name": "Friends",
                            "percentage": 33.33,
                            "color": "#7E57C2",
                            "subItems": [
                                { text: "Get back to Sarah", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Coffee with Mike", type: "single", children: [], scheduled: { date: d(2), time: "11:00", duration: 60 }, metadata: {} },
                                { text: "Zoo trip", type: "list", children: [
                                    { text: "Pick a date in group chat", children: [], completed: true },
                                    { text: "Book tickets online", children: [], completed: false },
                                    { text: "Organize lift sharing", children: [], completed: false },
                                    { text: "Pack picnic and sunscreen", children: [], completed: false }
                                ], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "12",
                            "name": "Family",
                            "percentage": 33.33,
                            "color": "#5E35B1",
                            "subItems": [
                                { text: "Call Mum", type: "repeating", children: [], scheduled: null, metadata: { recurrence: { frequency: "WEEKLY", interval: 1, byDay: ["SU"], time: "11:00", duration: 30, allDay: false, endType: "never" } } },
                                { text: "Plan summer visit", type: "list", children: [
                                    { text: "Check everyone's availability", children: [], completed: false },
                                    { text: "Book train tickets", children: [], completed: false },
                                    { text: "Sort out guest room", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Send birthday photos", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "13",
                            "name": "Community",
                            "percentage": 33.33,
                            "color": "#512DA8",
                            "subItems": [
                                { text: "School fundraiser", type: "list", children: [
                                    { text: "Attend planning meeting", children: [], completed: true },
                                    { text: "Design posters", children: [], completed: false },
                                    { text: "Print and distribute flyers", children: [], completed: false },
                                    { text: "Set up stall on the day", children: [], completed: false, scheduled: { date: d(5), time: "08:00", duration: 240 } }
                                ], scheduled: null, metadata: {} },
                                { text: "Volunteer at coding event", type: "single", children: [], scheduled: { date: d(90), time: "09:00", duration: 480 }, metadata: {} }
                            ]
                        }
                    ]
                }
            ],
        }
    }
}

const ExampleData3 = {

    get() {
        return {
            categories: [
                {
                    "id": "health",
                    "name": "Health",
                    "color": "#FF6B6B",
                    "items": [
                        {
                            "id": "4",
                            "name": "Exercise",
                            "percentage": 33.33,
                            "color": "#f05252",
                            "subItems": ["Morning jog", "Stretching routine", "Gym session"]
                        },
                        {
                            "id": "5",
                            "name": "Meal Prep",
                            "percentage": 33.33,
                            "color": "#E91E63",
                            "subItems": ["Plan weekly menu", "Food shopping", "Prep vegetables", "Cook batch meals"]
                        },
                        {
                            "id": "6",
                            "name": "Medical",
                            "percentage": 33.33,
                            "color": "#9C27B0",
                            "subItems": ["Schedule checkup", "Pick up prescription", "Update insurance"]
                        }
                    ]
                },
            ],
        }
    }

}
