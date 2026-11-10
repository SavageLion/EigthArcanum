class_name Data
extends RefCounted
# All the game tables, ported 1:1 from the canvas version (prototypes/foodtruck/index.html).

const DISH := {
	"burger": {"n": "Burger", "col": "#c8742a", "cd": 0.6, "dmg": 8.0, "spd": 230.0, "n0": 1, "pierce": 0, "desc": "A juicy shot straight at the queue."},
	"hotdog": {"n": "Hot Dog", "col": "#e0603a", "cd": 0.36, "dmg": 3.2, "spd": 290.0, "n0": 1, "pierce": 2, "desc": "Cooks fast, and flies through a whole line."},
	"taco": {"n": "Taco", "col": "#e8c040", "cd": 0.8, "dmg": 5.0, "spd": 210.0, "n0": 3, "spread": 0.5, "pierce": 0, "desc": "A shotgun spray of crunchy shells."},
	"pizza": {"n": "Pizza", "col": "#f0a030", "cd": 1.15, "dmg": 6.5, "spd": 170.0, "n0": 1, "boom": true, "pierce": 99, "desc": "A slice that flies out and comes back."},
	"icecream": {"n": "Ice Cream", "col": "#9adcf8", "cd": 1.3, "dmg": 3.5, "spd": 140.0, "n0": 1, "lob": true, "splash": 34.0, "pierce": 0, "desc": "A lobbed scoop that splashes and chills."},
}
const FLAV := {
	"spicy": {"n": "Spicy", "col": "#ff5a2a", "desc": "Sets customers on fire. Burning spreads, but it heats your kitchen!"},
	"frozen": {"n": "Frozen", "col": "#7fd8ff", "desc": "Chills customers to half speed."},
	"sour": {"n": "Sour", "col": "#b8e84a", "desc": "Puckers: a short stun and more damage."},
	"sweet": {"n": "Sweet", "col": "#ff9ad0", "desc": "Tips are doubled and the food homes in."},
	"greasy": {"n": "Greasy", "col": "#e8d070", "desc": "Knocks customers back and they slip."},
}
const RECIPE := {
	"burger_spicy": "Inferno Burger", "burger_frozen": "Frosty Patty", "burger_sour": "Pickle Burger", "burger_sweet": "Dessert Burger", "burger_greasy": "Double Smash",
	"hotdog_spicy": "Chili Dog", "hotdog_frozen": "Slush Dog", "hotdog_sour": "Pickle Dog", "hotdog_sweet": "Corn Dog",
	"taco_spicy": "Fire Taco", "taco_frozen": "Frosty Taco", "taco_sour": "Lime Taco", "taco_sweet": "Churro Taco", "taco_greasy": "Nacho Taco",
	"pizza_spicy": "Pepperoni Blaze", "pizza_frozen": "Ice Slice", "pizza_sour": "Pineapple Pizza", "pizza_sweet": "Dessert Pizza", "pizza_greasy": "Deep Dish",
	"icecream_spicy": "Mexican Sundae", "icecream_frozen": "Blizzard", "icecream_sour": "Sherbet", "icecream_sweet": "Banana Split", "icecream_greasy": "Fried Ice Cream",
}
const FUSION := {"burger_hotdog": "Burgerdog", "burger_taco": "Tacoburger", "burger_pizza": "Pizza Burger", "burger_icecream": "Burger Sundae", "hotdog_taco": "Taco Dog", "hotdog_pizza": "Pizza Dog", "hotdog_icecream": "Cold Dog", "pizza_taco": "Taco Pizza", "icecream_taco": "Taco Sundae", "icecream_pizza": "Pizza Sundae"}

const PERKS := [
	{"id": "plates", "t": "More Plates", "d": "+1 projectile for every dish.", "max": 3},
	{"id": "hands", "t": "Fast Hands", "d": "+20% fire rate."},
	{"id": "portion", "t": "Big Portions", "d": "+25% damage."},
	{"id": "skates", "t": "Roller Skates", "d": "+15% truck speed."},
	{"id": "magnet", "t": "Steady Aim", "d": "Flicks snap to customers 40% further, and splashes are wider."},
	{"id": "counter", "t": "Armoured Counter", "d": "-15% damage taken."},
	{"id": "bigplate", "t": "Big Plates", "d": "+25% food size."},
	{"id": "cashier", "t": "Cashier", "d": "+20% tips."},
]
const RELICS := [
	{"id": "pan", "t": "Cast Iron Pan", "d": "+1 projectile for every dish."},
	{"id": "ext", "t": "Fire Extinguisher", "d": "Your kitchen heats up half as fast."},
	{"id": "spat", "t": "Lucky Spatula", "d": "+15% damage."},
	{"id": "spoon", "t": "Golden Spoon", "d": "+25% tips."},
	{"id": "fridge", "t": "Mini Fridge", "d": "Chill lasts much longer."},
	{"id": "ghost", "t": "Ghost Pepper", "d": "Burning hurts 60% more."},
	{"id": "pickle", "t": "Pickle Jar", "d": "Sour stuns last twice as long."},
	{"id": "gps", "t": "GPS", "d": "+15 seconds to find a parking spot."},
	{"id": "loyal", "t": "Loyalty Card", "d": "+30% experience from fed customers."},
	{"id": "tires", "t": "Racing Tires", "d": "+20% truck speed."},
]
const UPG := [
	{"id": "engine", "n": "Engine", "d": "+8% speed.", "max": 3, "base": 30},
	{"id": "tires", "n": "Fuel-saver Tyres", "d": "-15% petrol use.", "max": 3, "base": 26},
	{"id": "armor", "n": "Armour Plating", "d": "+25 max health and heal 25.", "max": 3, "base": 28},
	{"id": "window", "n": "Second Window", "d": "+1 projectile for every dish.", "max": 2, "base": 60},
	{"id": "vent", "n": "Bigger Vent", "d": "Less kitchen heat, and -18% inspection.", "max": 2, "base": 34},
	{"id": "tank", "n": "Bigger Tank", "d": "+30 petrol capacity and a free +30.", "max": 2, "base": 40},
]
const STAFF := [
	{"id": "sous", "n": "Sous Chef Gordon", "d": "A third burner: cook three dishes at once. Swears a lot.", "price": 30, "spr": "pr3"},
	{"id": "waiter", "n": "Waiter Wendy", "d": "+35% tips from every customer. Flirts for them.", "price": 25, "spr": "pr6"},
	{"id": "dish", "n": "Dishwasher Dave", "d": "Kitchen cools faster, fires hurt half, stove fires out in 1.5 s.", "price": 25, "spr": "pr9"},
	{"id": "bouncer", "n": "Bouncer Bruno", "d": "Hungry customers at the counter chew 45% less.", "price": 35, "spr": "pr12"},
	{"id": "intern", "n": "Intern Kevin", "d": "Everything cooks 25% faster. Unpaid.", "price": 15, "spr": "pr1"},
]
const COMBOS := [
	{"ic": "c_triple", "n": "TRIPLE DECKER", "d": "Same dish 3 times in a row: the 3rd is a giant shot that pierces the whole queue."},
	{"ic": "c_thermal", "n": "THERMAL SHOCK", "d": "A spicy dish and a frozen dish within 3 throws: burns and stuns everyone."},
	{"ic": "c_surf", "n": "SURF & TURF", "d": "Dish A, dish B, dish A: chain lightning through 6 customers."},
	{"ic": "c_meal", "n": "COMBO MEAL", "d": "3 different dishes in a row: a food blast that hits every customer."},
]
const TRUCKS := [
	{"id": "red", "n": "Rusty Red", "dish": "burger", "hp": 1.2, "spd": 1.0},
	{"id": "teal", "n": "Teal Taco", "dish": "taco", "hp": 1.0, "spd": 1.12},
	{"id": "purple", "n": "Grape Soda", "dish": "icecream", "hp": 0.9, "spd": 1.05},
	{"id": "green", "n": "Pickle Express", "dish": "hotdog", "hp": 1.0, "spd": 1.2},
	{"id": "gold", "n": "Golden Spatula", "dish": "pizza", "hp": 1.35, "spd": 1.0},
]
const SPOTS := {
	"beach": {"n": "Beach Boardwalk", "desc": "Slow, sunburnt tourists. Big tips.", "spawn": 0.8, "spd": 0.8, "hp": 1.0, "tip": 1.5, "mix": {"walker": 6, "big": 1, "mob": 2}, "deco": "beach"},
	"office": {"n": "Office Park", "desc": "Lunch rush! Fast and plentiful.", "spawn": 1.3, "spd": 1.15, "hp": 1.0, "tip": 1.0, "mix": {"walker": 5, "jogger": 3, "karen": 1}, "deco": "office"},
	"stadium": {"n": "Stadium Lot", "desc": "Huge, tough crowds. Great tips.", "spawn": 1.15, "spd": 1.0, "hp": 1.3, "tip": 1.3, "mix": {"walker": 4, "big": 3, "mob": 2}, "deco": "stadium"},
	"festival": {"n": "Street Festival", "desc": "A bit of everything.", "spawn": 1.0, "spd": 1.0, "hp": 1.0, "tip": 1.1, "mix": {"walker": 4, "jogger": 2, "karen": 2, "big": 1, "mob": 1}, "deco": "festival"},
	"night": {"n": "Night Market", "desc": "Dark and neon. Fires burn hotter.", "spawn": 1.1, "spd": 1.05, "hp": 1.0, "tip": 1.2, "mix": {"walker": 4, "jogger": 2, "karen": 1, "mob": 2}, "deco": "night", "burn": 1.5},
	"gala": {"n": "Critics' Gala", "desc": "The food critic is here. Feed them!", "spawn": 0.9, "spd": 1.0, "hp": 1.1, "tip": 1.4, "mix": {"walker": 5, "karen": 2, "jogger": 1}, "deco": "gala"},
}
const CT := {
	"walker": {"n": "Hungry Customer", "hp": 8.0, "spd": 27.0, "dmg": 2.5, "h": 22.0, "tip": 1.0, "xp": 1.0, "pool": ["pr0", "pr1", "pr4", "pr5", "pr10", "pr11", "pr12", "pr14", "pm3", "pm4", "pr15", "pr7"]},
	"jogger": {"n": "Jogger", "hp": 5.5, "spd": 56.0, "dmg": 2.6, "h": 21.0, "tip": 1.0, "xp": 1.0, "pool": ["pr2", "pr8", "pm2"]},
	"big": {"n": "Big Eater", "hp": 40.0, "spd": 19.0, "dmg": 6.5, "h": 34.0, "tip": 5.0, "xp": 4.0, "pool": ["pr6", "pr13"]},
	"karen": {"n": "Karen", "hp": 24.0, "spd": 26.0, "dmg": 0.0, "h": 24.0, "tip": 3.0, "xp": 3.0, "pool": ["pr9", "pr3"], "ranged": true},
	"mob": {"n": "Hangry Kid", "hp": 3.0, "spd": 52.0, "dmg": 1.6, "h": 13.0, "tip": 0.4, "xp": 0.5, "pool": ["pm5", "pm6", "pm7"]},
	"critic": {"n": "The Food Critic", "hp": 420.0, "spd": 20.0, "dmg": 12.0, "h": 46.0, "tip": 30.0, "xp": 20.0, "pool": ["pm7"], "boss": true},
}
const STOPN := {"shift": "Lunch Rush", "kitchen": "Kitchen", "mechanic": "Mechanic", "gas": "Gas Station", "cook": "Cook-off"}
const STOPC := {"shift": "#ffb84a", "kitchen": "#9ad8ff", "mechanic": "#c8d0e0", "gas": "#7ae07a", "cook": "#ff6a8a"}
const QUIPS := {
	1: ["I have had better meals from a bin.", "Never again. Never. Again."],
	2: ["Not great, not terrible. Mostly terrible.", "My dog looked embarrassed for me."],
	3: ["It was food. Technically.", "Fine. I will be back, probably."],
	4: ["Really good! Slightly flaming, but good.", "Would get hit by a taco again."],
	5: ["Best food truck I have ever walked away from, smoking.", "I would marry this burger."],
}
