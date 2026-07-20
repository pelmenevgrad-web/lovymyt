# ЛовиМить — техническая спецификация проекта

Telegram Mini App для поиска компании на отдых по интересам: карта заходів,
подключение к участникам, чаты по заходам, рейтинги, симпатии за звёзды,
PRO-подписка.

## 1. Концепция

Пользователь открывает карту, видит заходи рядом (по категориям: спорт,
прогулки, настолки, барбекю, концерты, путешествия и т.д.). Может:
- создать свій захід с точкой на карте, временем и условиями участия
- присоединиться к уже существующему (запрос → подтверждение организатором,
  либо мгновенное вступление, если открытое)

Когда участники собраны — автоматически создаётся чат заходу. После
завершения встречи участники могут оставить друг другу оценку и отзыв.
Есть возможность отправить симпатию (сердечко) или подарок за Telegram Stars.

## 2. Стек

- Frontend (Mini App): React → Vercel
- Backend: Node.js + Telegraf (бот) + Socket.io или Supabase Realtime → Render
- База данных: Supabase PostgreSQL + расширение PostGIS (геозапросы)
- Админка: React → Vercel
- Платежи: Telegram Payments API (Stars)

## 3. Структура репозитория

```
lovymyt/
├── frontend/        React Mini App
├── backend/         Node.js + Telegraf + Socket.io
├── admin/           React админка (модерация, жалобы, статистика)
└── docs/            этот файл и прочая документация
```

## 4. Схема базы данных

### users
| поле | тип | описание |
|---|---|---|
| id | uuid | PK |
| telegram_id | bigint | уникальный |
| username, first_name, avatar_url | text | |
| bio | text | |
| birth_date | date | для возрастных фильтров |
| is_verified | boolean | бейдж верификации |
| rating_avg | numeric | пересчитывается по reviews |
| rating_count | int | |
| events_created_count, events_joined_count, no_show_count | int | доверие |
| is_pro | boolean | |
| pro_expires_at | timestamptz | |
| stars_balance | int | опционально, если нужен внутренний баланс |
| created_at, last_active_at | timestamptz | |

### categories
id, name, icon, sort_order — справочник (спорт, прогулки, настолки, барбекю…)

### events
| поле | тип | описание |
|---|---|---|
| id | uuid | PK |
| creator_id | uuid | FK users |
| category_id | int | FK categories |
| title, description | text | |
| location | geography(Point) | PostGIS |
| address_text | text | |
| radius_visibility | enum | public / accepted_only |
| start_time, end_time | timestamptz | |
| status | enum | planned / gathering / active / completed / cancelled |
| max_participants, min_participants | int | |
| budget_type | enum | each_pays / shared / free |
| budget_amount | numeric | |
| age_min, age_max | int | |
| conditions | jsonb | { with_pets, with_kids, verified_only, ... } |
| chat_id | uuid | FK event_chats |
| created_at | timestamptz | |

### event_participants
id, event_id, user_id, status (invited/requested/accepted/declined/left), joined_at

### event_chats / chat_messages
Если через Supabase Realtime — просто таблицы, на которые подписываются клиенты.
chat_messages: id, chat_id, sender_id, text, created_at, is_system

### reviews
id, event_id, from_user_id, to_user_id, rating (1-5), comment, created_at
Отзыв разрешён только если оба были участниками одного event_id.

### status_tags_catalog
Справочник статусов-бейджей, которые участники ставят друг другу после встречи.
| поле | тип | описание |
|---|---|---|
| id | int | PK |
| key | text | напр. `shashlyk_guru`, `stingy`, `freeloader` |
| label | text | название (тянется из translations по ключу `tag.<key>`) |
| icon | text | эмодзи или иконка |
| sentiment | enum | positive / playful_negative |
| is_active | boolean | |

### user_status_tags
Кто кому какой статус поставил.
| поле | тип | описание |
|---|---|---|
| id | uuid | PK |
| event_id | uuid | FK events — обязателен, ставить можно только по общему заходу |
| from_user_id, to_user_id | uuid | FK users |
| tag_id | int | FK status_tags_catalog |
| created_at | timestamptz | |

Уникальный индекс на (event_id, from_user_id, to_user_id, tag_id) — чтобы
нельзя было спамить один и тот же тег много раз за одну встречу.

На профиле показываются топ-3 тега по количеству получений (агрегат по
user_status_tags.tag_id для данного to_user_id). Playful_negative-теги
отображаются публично только начиная с 3+ отметок от разных пользователей —
это защита от токсичного использования одним недоброжелателем.

### likes_gifts
id, from_user_id, to_user_id, event_id, type (like/gift), gift_id, stars_amount, created_at

### gifts_catalog
id, name, icon_animated_url, price_stars

### stars_transactions
id, user_id, type (topup/pro_purchase/gift_sent/gift_received), amount,
telegram_payment_charge_id, created_at

### reports
id, event_id, from_user_id, target_user_id, reason, status, created_at

### Индексы
- GIST-индекс на events.location (обязателен для геопоиска)
- составной индекс на event_participants(event_id, status)
- rating_avg пересчитывать триггером при вставке review, не на лету

## 5. Экраны (MVP)

### Карта
- полноэкранная карта, метки заходів с иконкой категории
- заходи "сейчас" визуально выделены (пульсация/кольцо)
- фильтр-чипы категорий сверху (горизонтальный скролл)
- нижняя карточка ближайшего/выбранного заходу с превью
- кнопка геолокации

### Профиль
- аватар, имя, бейдж верификации, PRO-бейдж
- рейтинг и число встреч
- топ-3 статуса-бейджа (напр. "🔥 Гуру шашлика ×7", "🎉 Душа компании ×4")
- статистика: организовал / % неявок
- отзывы от других участников
- кнопка отправки симпатии за звёзды

### Экран после завершения заходу (оценка участников)
- список участников, по каждому: оценка 1-5 + выбор статуса-тега из каталога
  (можно несколько за раз)
- позитивные и playful_negative теги визуально разделены (не смешаны в один
  ряд), чтобы это ощущалось как игра, а не как донос

### Создание заходу
- выбор категории (чипы)
- место (точка на карте) и время / отметка "прямо сейчас"
- количество участников (слайдер min-max)
- условия участия как теги: складчина/каждый сам, с животными, с детьми,
  только verified, возрастные рамки
- кнопка "Создать и открыть чат"

## 6. PRO-функции (за звёзды/подписка)

- видеть, кто посмотрел профиль / кто поставил симпатию
- приоритет в выдаче на карте
- расширенные фильтры (% совпадения интересов, только verified)
- закрытые/приватные заходи по инвайту
- больше одновременных активных заходів (у free — лимит 1-2)
- расширенная статистика профиля
- кастомный бейдж/рамка аватара
- отмена/редактирование заходу без штрафа к рейтингу
- push-уведомления с фильтрами по времени/близости

## 7. Доверие и безопасность

- верификация по номеру телефона Telegram (+ опционально фото-верификация)
- организатор может скрывать точную точку до подтверждения заявки
- жалобы и блокировка прямо из чата заходу
- защита от накрутки отзывов (только между реальными участниками одного event)

## 8. Монетизация

- Telegram Stars: симпатии, подарки, PRO-подписка
- 10% комиссия платформы с подарков (по аналогии с моделью ТИКІОІКИ)