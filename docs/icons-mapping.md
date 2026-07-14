# ЛовиМить — мапінг іконок (lucide-react)

Тимчасовий набір іконок для заміни emoji, поки Юрій домальовує власний SVG-набір
у Sketch. Бібліотека: `lucide-react` (легка, tree-shakeable, консистентний stroke-style).

## Категорії

| Категорія | emoji зараз | lucide іконка | import |
|---|---|---|---|
| Усі | 🔥 | `Flame` | `import { Flame } from 'lucide-react'` |
| Спорт | ⚽ | `Volleyball` (або `Dumbbell` якщо про фітнес ширше) | `Volleyball` |
| Прогулки | 🚶 | `Footprints` | `Footprints` |
| Настолки | 🎲 | `Dices` | `Dices` |
| Барбекю | 🍖 | `Flame` вже зайнятий "Усі" — краще `UtensilsCrossed` або `Beef` | `UtensilsCrossed` |
| Концерти | 🎵 | `Music` | `Music` |
| Подорожі | ✈️ | `Plane` | `Plane` |

## Статуси-бейджі (позитивні)

| Статус | emoji зараз | lucide іконка |
|---|---|---|
| Гуру шашлику | 🔥 | `ChefHat` |
| Душа компанії | 🎉 | `PartyPopper` |
| Пунктуальний | ⏰ | `Clock` |
| Майстер настолок | 🎲 | `Dices` |
| Легко спілкуватись | 💬 | `MessageCircleHeart` |

## Статуси-бейджі (playful_negative)

| Статус | emoji зараз | lucide іконка |
|---|---|---|
| Жмот | 💸 | `Coins` (або `PiggyBank` перекреслений) |
| Халявщик | 🎁 | `Gift` |
| Проспав збір | 😴 | `AlarmClockOff` |
| Пропав з радарів | 📵 | `PhoneOff` |

## Інтерфейсні іконки (не категорії, але теж варто уніфікувати)

| Призначення | emoji зараз | lucide іконка |
|---|---|---|
| Пошук | 🔍 | `Search` |
| Налаштування/фільтри | ⚙️ | `SlidersHorizontal` |
| Моя геолокація | 🎯 | `LocateFixed` |
| Верифікація | ✓ | `BadgeCheck` |
| Зірки/PRO | ⭐ | `Star` (заповнений — `fill="currentColor"`) |
| PRO-блок | ✨ | `Sparkles` |
| Симпатія/лайк | ❤️ | `Heart` |
| Створити (+) | ➕ | `Plus` |
| Профіль | 👤 | `User` |
| Карта (таб) | 🗺 | `Map` |
| Ракета (кнопка створення) | 🚀 | `Rocket` |
| З тваринами | 🐾 | `PawPrint` |
| З дітьми | 👶 | `Baby` |
| Гроші/бюджет | 💳 / 🤝 | `CreditCard` / `Handshake` |
| Подарунок безкоштовно | 🎁 | `Gift` |

## Технічні примітки для Claude Code

- Встановити: `npm install lucide-react`
- Розмір іконок у категоріях/статусах: `size={18}` в чипсах, `size={22}` в нижній навігації
- Колір іконки успадковує `currentColor` — задавати через `color` проп або
  батьківський CSS `color`, не хардкодити hex всередині SVG
- Це тимчасовий набір — коли Юрій надасть власні SVG (Sketch export),
  замінювати іконку за іконкою, зберігаючи ту саму структуру `import { X } from 'lucide-react'`
  → `import X from '../assets/icons/x.svg?react'` (з vite-plugin-svgr, якщо
  потрібен SVG як React-компонент)