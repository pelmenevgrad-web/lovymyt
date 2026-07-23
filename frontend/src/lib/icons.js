import {
  Flame, Volleyball, Footprints, Dices, UtensilsCrossed, Music, Plane, Sparkles, PartyPopper,
  Laugh, Music2, Clock, Camera, VolumeX, MessageCircle, Star, Heart, Coffee, BookOpen, Bike,
  Waves, Mountain, Palette, Gamepad2, Film, Mic2, ShoppingBag, Dumbbell, Trees, Car, Cake, Wine,
  Users, Baby, PawPrint, Guitar, Trophy, Gift, Handshake, Sun, Moon, Tent, Fish, Anchor, Cat,
  Dog, Pizza, IceCreamCone, Beer, MapPin, Compass, Rocket, Building2, GraduationCap, Briefcase,
  Target, Medal, Flag, Timer, Radio, Headphones, Drum, Piano, Soup, Sandwich, Croissant, Apple,
  Carrot, Salad, Popcorn, CupSoda, Martini, Beef, Cookie, Candy, Donut, Ship, Sailboat,
  TrainFront, Bus, Luggage, Backpack, Globe, Map, Caravan, FerrisWheel, CloudRain, Snowflake,
  Umbrella, Rainbow, TreePine, Flower, Flower2, Leaf, Bird, Rabbit, Turtle, Squirrel, Home, Tv,
  BookMarked, Puzzle, Dice5, Smile, SmilePlus, Frown, Angry, ThumbsUp, Award, Crown, Wrench,
  Brush, Scissors, Package, Ticket, Clapperboard, Drama, Theater, TentTree, Swords, Bomb, Skull,
  Ghost, Bug, Sparkle, Feather, Shirt, Glasses, Hand, HeartHandshake, Grape, Church, Landmark,
  Palmtree, Snail, Bone, ChefHat, Utensils, Lightbulb, BadgeDollarSign, Wallet, Banknote, Watch,
  Key, Bell, Volume2, Speaker, Video, Joystick, Axe, Hammer, Shovel, Sprout, TreeDeciduous,
  CloudSnow, Droplet, Gem,
} from 'lucide-react'

// Named imports (not `import *`) so the bundler can tree-shake — pulling in
// every lucide icon nearly tripled the bundle when this used a wildcard import.
const ICON_MAP = {
  Flame, Volleyball, Footprints, Dices, UtensilsCrossed, Music, Plane, Sparkles, PartyPopper,
  Laugh, Music2, Clock, Camera, VolumeX, MessageCircle, Star, Heart, Coffee, BookOpen, Bike,
  Waves, Mountain, Palette, Gamepad2, Film, Mic2, ShoppingBag, Dumbbell, Trees, Car, Cake, Wine,
  Users, Baby, PawPrint, Guitar, Trophy, Gift, Handshake, Sun, Moon, Tent, Fish, Anchor, Cat,
  Dog, Pizza, IceCreamCone, Beer, MapPin, Compass, Rocket, Building2, GraduationCap, Briefcase,
  Target, Medal, Flag, Timer, Radio, Headphones, Drum, Piano, Soup, Sandwich, Croissant, Apple,
  Carrot, Salad, Popcorn, CupSoda, Martini, Beef, Cookie, Candy, Donut, Ship, Sailboat,
  TrainFront, Bus, Luggage, Backpack, Globe, Map, Caravan, FerrisWheel, CloudRain, Snowflake,
  Umbrella, Rainbow, TreePine, Flower, Flower2, Leaf, Bird, Rabbit, Turtle, Squirrel, Home, Tv,
  BookMarked, Puzzle, Dice5, Smile, SmilePlus, Frown, Angry, ThumbsUp, Award, Crown, Wrench,
  Brush, Scissors, Package, Ticket, Clapperboard, Drama, Theater, TentTree, Swords, Bomb, Skull,
  Ghost, Bug, Sparkle, Feather, Shirt, Glasses, Hand, HeartHandshake, Grape, Church, Landmark,
  Palmtree, Snail, Bone, ChefHat, Utensils, Lightbulb, BadgeDollarSign, Wallet, Banknote, Watch,
  Key, Bell, Volume2, Speaker, Video, Joystick, Axe, Hammer, Shovel, Sprout, TreeDeciduous,
  CloudSnow, Droplet, Gem,
}

// Curated set offered in the admin icon picker, and the lookup categories/
// funny-statuses use to turn their stored icon_name string back into a component.
export const ICON_CHOICES = Object.keys(ICON_MAP)

export function resolveIcon(name) {
  return (name && ICON_MAP[name]) || Sparkles
}
