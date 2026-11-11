import {
  Briefcase, Car, Circle, CirclePlus, Coffee, Dumbbell, Gift, GraduationCap, HeartPulse, Home, PartyPopper,
  PawPrint, Plane, Repeat, Shirt, ShoppingCart, Smartphone, Utensils, type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  home: Home, 'shopping-cart': ShoppingCart, utensils: Utensils, car: Car, 'party-popper': PartyPopper,
  repeat: Repeat, 'heart-pulse': HeartPulse, shirt: Shirt, circle: Circle, briefcase: Briefcase,
  'plus-circle': CirclePlus, coffee: Coffee, plane: Plane, 'graduation-cap': GraduationCap, gift: Gift,
  'paw-print': PawPrint, smartphone: Smartphone, dumbbell: Dumbbell,
};

export function CategoryIcon({ icon, size = 18, className }: { icon: string | null | undefined; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[icon ?? 'circle'] ?? Circle;
  return <Icon size={size} className={className} />;
}
