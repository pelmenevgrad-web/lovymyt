import {
  Flame, Volleyball, Footprints, Dices, UtensilsCrossed, Music, Plane, Sparkles,
  PartyPopper, Laugh, Music2, Clock, Camera, VolumeX, MessageCircle, Star, Heart,
  Coffee, BookOpen, Bike, Waves, Mountain, Palette, Gamepad2, Film, Mic2,
  ShoppingBag, Dumbbell, Trees, Car, Cake, Wine, Users, Baby, PawPrint, Guitar,
  Trophy, Gift, Handshake, Sun, Moon, Tent, Fish, Anchor, Cat, Dog, Pizza,
  IceCreamCone, Beer, MapPin, Compass, Rocket, Building2, GraduationCap, Briefcase,
} from 'lucide-react'

// Named imports (not `import *`) so the bundler can tree-shake — pulling in
// every lucide icon nearly tripled the bundle when this used a wildcard import.
const ICON_MAP = {
  Flame, Volleyball, Footprints, Dices, UtensilsCrossed, Music, Plane, Sparkles,
  PartyPopper, Laugh, Music2, Clock, Camera, VolumeX, MessageCircle, Star, Heart,
  Coffee, BookOpen, Bike, Waves, Mountain, Palette, Gamepad2, Film, Mic2,
  ShoppingBag, Dumbbell, Trees, Car, Cake, Wine, Users, Baby, PawPrint, Guitar,
  Trophy, Gift, Handshake, Sun, Moon, Tent, Fish, Anchor, Cat, Dog, Pizza,
  IceCreamCone, Beer, MapPin, Compass, Rocket, Building2, GraduationCap, Briefcase,
}

// Curated set offered in the admin icon picker, and the lookup categories/
// funny-statuses use to turn their stored icon_name string back into a component.
export const ICON_CHOICES = Object.keys(ICON_MAP)

export function resolveIcon(name) {
  return (name && ICON_MAP[name]) || Sparkles
}
