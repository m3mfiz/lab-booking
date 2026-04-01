# Lab Booking

Веб-приложение для бронирования мест в компьютерном лабе. Сотрудники входят в систему, видят еженедельный календарь с доступностью и забронировать свободные временные слоты. Администраторы управляют пользователями, настройками лаба (количество мест, рабочие часы) и просматривают статистику использования.

## Основные возможности

- **Аутентификация**: Вход по логину и пароролю с JWT токенами (access + refresh с ротацией)
- **Календарь и бронирование**:
  - Еженедельный вид с сеткой на десктопе и карточками на мобильнике
  - Свободная бронь (любое время начала/конца в рамках рабочих часов)
  - Реальная доступность (количество свободных мест по часам)
  - Бронирование максимум на 7 дней вперед, без прошлых дат
  - Отмена бронировки в любой момент (даже во время активной брони)
- **Панель администратора**:
  - Управление пользователями (создание, редактирование, мягкое удаление)
  - Управление лабом (количество мест, рабочие часы)
  - Статистика использования (столбчатая диаграмма + таблица по дням/неделям)
- **Дополнительно**:
  - Живая страница статуса ("Сейчас в лабе")
  - Смена пароля
  - Логирование аудита
  - Rate limiting на вход
  - Адаптивный дизайн (мобильный + десктоп)

## Технологический стек

**Backend** (Fastify, PostgreSQL, Drizzle ORM):
- Node.js 22
- Fastify 5 — высокопроизводительный вебфреймворк
- PostgreSQL 16 — реляционная БД
- Drizzle ORM — типизированный ORM
- JWT с refresh token ротацией
- Bcrypt — хеширование паролей
- Rate limiting и CORS

**Frontend** (React, Vite):
- React 18 — UI библиотека
- Vite — быстрая сборка
- React Router 6 — маршрутизация
- date-fns — работа с датами
- TypeScript — статическая типизация

**DevOps**:
- Docker + Docker Compose
- PM2 — управление процессами
- Миграции и seed данные (Drizzle Kit)

## Быстрый старт

### Локальная разработка

**Требования:**
- Node.js 22+
- PostgreSQL 14+ (или использовать Docker Compose)
- npm 10+

**1. Клонирование и установка зависимостей:**

```bash
git clone https://github.com/m3mfiz/lab-booking.git
cd lab-booking
npm install
```

**2. Конфигурация переменных окружения:**

```bash
cp .env.example .env
```

Отредактируйте `.env` и установите свои значения (особенно `JWT_SECRET` и `JWT_REFRESH_SECRET`):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lab_booking
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
PORT=3001
NODE_ENV=development
TZ=Europe/Moscow
```

**3. Инициализация БД:**

```bash
npm run db:setup
```

Команда выполнит миграции и заполнит БД начальными данными:
- Пользователь: `admin` / `admin123`
- Лаб: Main Lab, 10 мест, 09:00–18:00

**4. Запуск в режиме разработки:**

```bash
npm run dev
```

Это запустит сервер и клиент параллельно:
- Сервер: http://localhost:3001
- Клиент (dev): http://localhost:5173

Отдельный запуск сервера или клиента:

```bash
npm run dev:server  # только backend
npm run dev:client  # только frontend
```

### Docker

**1. Запуск через Docker Compose:**

```bash
docker-compose up
```

Приложение будет доступно по адресу http://localhost:3001

**2. Инициализация БД в контейнере:**

```bash
docker-compose exec app npm run db:setup
```

**3. Остановка:**

```bash
docker-compose down
```

Для полной очистки (включая данные БД):

```bash
docker-compose down -v
```

## Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|---------|--------------|
| `DATABASE_URL` | Строка подключения PostgreSQL | - |
| `JWT_SECRET` | Секретный ключ для access токенов | - |
| `JWT_REFRESH_SECRET` | Секретный ключ для refresh токенов | - |
| `PORT` | Порт сервера | 3001 |
| `NODE_ENV` | Окружение (development/production) | development |
| `TZ` | Часовой пояс (e.g. Europe/Moscow) | UTC |

### Токены и безопасность

- **Access token**: действует 15 минут
- **Refresh token**: действует 7 дней, хранится в БД, может быть отозван
- **Ротация**: при обновлении refresh token старый токен помечается как revoked в БД
- **Rate limiting**: максимум 5 попыток входа в минуту с одного IP

## Структура проекта

```
lab-booking/
├── packages/
│   ├── server/
│   │   ├── src/
│   │   │   ├── db/               # Схема, миграции, seed
│   │   │   ├── routes/           # API endpoints
│   │   │   ├── services/         # Бизнес-логика
│   │   │   ├── middleware/       # Auth, errors
│   │   │   ├── plugins/          # Fastify plugins (DB, JWT)
│   │   │   ├── utils/            # Config, password, errors
│   │   │   └── index.ts          # Точка входа
│   │   └── package.json
│   └── client/
│       ├── src/
│       │   ├── pages/            # Страницы
│       │   ├── components/       # Компоненты
│       │   ├── api/              # API клиент
│       │   ├── hooks/            # React hooks
│       │   ├── context/          # Context providers
│       │   └── types/            # TypeScript типы
│       └── package.json
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs          # PM2 конфигурация
└── README.md
```

## API обзор

### Аутентификация

**POST /api/auth/login**
```json
{
  "username": "admin",
  "password": "admin123"
}
```
Ответ: `{ access_token, refresh_token, user }`

**POST /api/auth/refresh**
```json
{
  "refresh_token": "..."
}
```
Ответ: `{ access_token, refresh_token }` (с ротацией)

**POST /api/auth/logout**
```json
{
  "refresh_token": "..."
}
```

**GET /api/auth/me**
Текущий пользователь (требует access token в header)

**PATCH /api/auth/password**
```json
{
  "current_password": "...",
  "new_password": "..."
}
```

### Бронирование

**GET /api/bookings?from=2025-01-15&to=2025-01-22**
Все бронирования в период (7 дней по умолчанию)

**GET /api/bookings/my?filter=upcoming|past&page=1**
Мои бронирования (фильтр и пагинация)

**GET /api/bookings/today**
Бронирования на сегодня

**GET /api/bookings/availability?from=2025-01-15&to=2025-01-16**
Доступность (свободные места по часам)

**POST /api/bookings**
```json
{
  "start_time": "2025-01-15T09:00:00Z",
  "end_time": "2025-01-15T11:00:00Z"
}
```

**PATCH /api/bookings/:id/cancel**
Отмена бронирования

### Лаб

**GET /api/labs**
Информация о лабе (количество мест, рабочие часы)

### Администрирование

**GET /api/admin/users**
Список всех пользователей

**POST /api/admin/users**
```json
{
  "username": "newuser",
  "password": "password123",
  "full_name": "John Doe",
  "role": "user"
}
```

**PATCH /api/admin/users/:id**
```json
{
  "full_name": "...",
  "role": "admin|user",
  "password": "..."
}
```

**DELETE /api/admin/users/:id**
Мягкое удаление пользователя

**PUT /api/admin/labs**
```json
{
  "name": "Main Lab",
  "total_seats": 15,
  "work_start_time": "08:00",
  "work_end_time": "20:00"
}
```

**GET /api/admin/stats?from=2025-01-01&to=2025-01-31&period=day|week**
Статистика использования

## Развертывание

### На сервере (PM2)

**1. Установка зависимостей:**

```bash
npm ci
```

**2. Сборка клиента:**

```bash
npm run build
```

**3. Миграция и seed БД:**

```bash
npm run db:setup
```

**4. Запуск с PM2:**

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

**5. Мониторинг:**

```bash
pm2 monit
pm2 logs lab-booking
```

### На сервере (Docker)

```bash
# Создать .env с production переменными
docker-compose -f docker-compose.yml up -d

# Инициализировать БД
docker-compose exec app npm run db:setup

# Просмотр логов
docker-compose logs -f app
```

## Разработка и тестирование

**Запуск тестов:**

```bash
npm -w packages/server run test
```

**Миграция БД вручную:**

```bash
npm -w packages/server run db:migrate
```

**Заполнение БД:**

```bash
npm -w packages/server run db:seed
```

**Сборка клиента:**

```bash
npm run build
```

Результат находится в `packages/client/dist`

## База данных

### Таблицы

- **users**: пользователи (логин, хеш пароля, роль, мягкое удаление)
- **computer_labs**: лабы (название, количество мест, рабочие часы)
- **bookings**: бронирования (пользователь, лаб, время, статус)
- **refresh_tokens**: токены обновления (хеш, срок, revoke статус)
- **audit_log**: логирование действий (action, пользователь, entity, детали)

## Лицензия

Проект является частной разработкой.

## Контакты и поддержка

GitHub репозиторий: https://github.com/m3mfiz/lab-booking
