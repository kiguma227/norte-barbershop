# Norte — лендинг барбершопа

**Сайт:** https://kiguma227.github.io/norte-barbershop/

Фронтенд-демо одностраничного сайта барбершопа Norte (Аликанте). Три языка — испанский, английский и русский. Бэкенда нет: форма записи проверяет данные и показывает подтверждение, но ничего не отправляет.

## Запуск

Сайт работает без сборки и без сервера: достаточно открыть `index.html` в браузере. Скрипты подключены обычными `defer`-файлами, без ES-модулей и `fetch`, поэтому работают и через `file://`.

Для локального сервера:

```bash
python -m http.server 8765
```

Язык задаётся параметром `?lang=es|en|ru`. Если параметра нет, берётся сохранённый выбор (localStorage), затем язык браузера, затем испанский.

## Структура

```
index.html
css/
  tokens.css       цвета, типографика, отступы, easing, длительности
  base.css         @font-face, сброс, базовая типографика, фокус
  layout.css       хедер, мобильное меню, hero, сетки секций, футер
  components.css   кнопки, меню услуг, карточки, галерея, lightbox, форма, карта
  motion.css       появление, маски hero, параллакс, reduced motion
js/
  i18n/es.js, en.js, ru.js   словари с одинаковой структурой ключей
  i18n.js          применение языка, Intl-форматы, переключатель
  schedule.js      часы работы, статус «открыто/закрыто» по времени Мадрида
  header.js        скрытие хедера при скролле, мобильное меню, блокировка скролла
  hero.js          разбивка заголовка на строки, intro, запасной параллакс
  reveal.js        IntersectionObserver для появления секций, счётчики
  gallery.js       lightbox с FLIP-переходом, стрелки, свайпы
  booking.js       календарь, слоты, валидация, подтверждение
  main.js          инициализация модулей, обработка битых изображений
assets/fonts/      woff2, наборы latin и cyrillic
assets/images/     hero/, team/, gallery/, about/, og-norte.jpg, иконки
```

## Технические решения

- **Библиотек нет.** Все анимации сделаны на CSS и нативном JS.
  - Маска строк hero: `overflow: clip` плюс `transform`.
  - Раскрытие фото мастеров: `clip-path`.
  - Появление секций: IntersectionObserver.
  - Lightbox: FLIP через Web Animations API. Обрезку миниатюры компенсирует `clip-path: inset()`.
  - Параллакс: scroll-driven animations. В браузерах без поддержки (сейчас это стабильный Firefox) работает запасной вариант на `requestAnimationFrame`.
  - Смена языка: кроссфейд через View Transitions, запасной вариант — затухание текстов.
- **Шрифты загружаются локально** через `@font-face` с `font-display: swap`. Внешних запросов нет.
- **`prefers-reduced-motion`.** Смещения, маски и параллакс отключаются, остаются короткие затухания.
- **Тач-устройства.** Hover-эффекты подключены только для `(hover: hover) and (pointer: fine)`.
- **Форматы через Intl.** Цены, минуты, дни недели, даты, часы работы, числа. Для английского используется локаль `en-GB`.

## Шрифты

Обе гарнитуры распространяются по лицензии [SIL Open Font License 1.1](https://openfontlicense.org). Файлы woff2 взяты из пакетов [Fontsource](https://fontsource.org) 5.3.0: это те же файлы, что отдаёт Google Fonts.

| Шрифт | Автор | Начертания | Источник |
|---|---|---|---|
| Cormorant | Christian Thalmann (Catharsis Fonts) | 500, 600, 500 italic | [fonts.google.com/specimen/Cormorant](https://fonts.google.com/specimen/Cormorant), [npm @fontsource/cormorant](https://www.npmjs.com/package/@fontsource/cormorant) |
| Manrope | Mikhail Sharanda | 400, 500, 600 | [fonts.google.com/specimen/Manrope](https://fonts.google.com/specimen/Manrope), [npm @fontsource/manrope](https://www.npmjs.com/package/@fontsource/manrope) |

## Фотографии

Все снимки взяты с [Unsplash](https://unsplash.com) по [лицензии Unsplash](https://unsplash.com/license): бесплатное использование, в том числе коммерческое. Unsplash+ не использовался.

Что сделано с фото:
- Все снимки кадрированы, уменьшены до 2000 px и меньше, пересжаты в webp с качеством 80.
- Ко всем применена одинаковая лёгкая цветокоррекция. Портреты мастеров дополнительно выровнены по тону, чтобы смотреться одной серией.
- На hero-фото с рубашки мастера отретуширован логотип чужого барбершопа.

| Файлы | Автор | Оригинал |
|---|---|---|
| `hero/hero-ritual-*.webp`, `og-norte.jpg` | Mitchell Orr | [unsplash.com/photos/iDbTDUzQTxY](https://unsplash.com/photos/iDbTDUzQTxY) |
| `hero/hero-chair-*.webp` | Redd Francisco | [unsplash.com/photos/41HCQN43PwU](https://unsplash.com/photos/41HCQN43PwU) |
| `team/marcos-*.webp` | Yassin mer | [unsplash.com/photos/RQRuwae90W8](https://unsplash.com/photos/RQRuwae90W8) |
| `team/alvaro-*.webp` | Lance Reis | [unsplash.com/photos/TTdJV-K1IUg](https://unsplash.com/photos/TTdJV-K1IUg) |
| `team/diego-*.webp` | ihor | [unsplash.com/photos/0szhmTrnSnY](https://unsplash.com/photos/0szhmTrnSnY) |
| `gallery/royal-shave-*.webp` | Antonio Reynoso | [unsplash.com/photos/_25iXtaa6oY](https://unsplash.com/photos/_25iXtaa6oY) |
| `gallery/razor-lineup-*.webp` | Agustin Fernandez | [unsplash.com/photos/1Pmp9uxK8X8](https://unsplash.com/photos/1Pmp9uxK8X8) |
| `gallery/clipper-fade-*.webp` | mico del rosario | [unsplash.com/photos/-6qyEg2N91k](https://unsplash.com/photos/-6qyEg2N91k) |
| `gallery/kids-braids-*.webp` | John Rodriguez | [unsplash.com/photos/iE0CS-rupQc](https://unsplash.com/photos/iE0CS-rupQc) |
| `gallery/beard-trim-*.webp` | César Badilla Miranda | [unsplash.com/photos/YBKXbGwNDqc](https://unsplash.com/photos/YBKXbGwNDqc) |
| `gallery/scissor-cut-*.webp` | Jonathan Cooper | [unsplash.com/photos/sS3qRFsKZlg](https://unsplash.com/photos/sS3qRFsKZlg) |
| `gallery/beard-shaping-*.webp` | César Badilla Miranda | [unsplash.com/photos/IPShxkEC064](https://unsplash.com/photos/IPShxkEC064) |
| `gallery/short-crop-*.webp` | Behrooz | [unsplash.com/photos/rgkpL0SrrmI](https://unsplash.com/photos/rgkpL0SrrmI) |
| `about/interior-*.webp` | Oriol Pascual | [unsplash.com/photos/Ta0eXTDCNqY](https://unsplash.com/photos/Ta0eXTDCNqY) |
| `about/vinyl-*.webp` | Thibault Lam Tran | [unsplash.com/photos/g6GZmSQgu-M](https://unsplash.com/photos/g6GZmSQgu-M) |

Профили авторов:
- [Mitchell Orr](https://unsplash.com/@mitchorr)
- [Redd Francisco](https://unsplash.com/@reddfrancisco)
- [Yassin mer](https://unsplash.com/@yassinmer)
- [Lance Reis](https://unsplash.com/@lancereis)
- [ihor](https://unsplash.com/@ishlpnk)
- [Antonio Reynoso](https://unsplash.com/@infantleon)
- [Agustin Fernandez](https://unsplash.com/@agustinfernandez)
- [mico del rosario](https://unsplash.com/@micodelrosario)
- [John Rodriguez](https://unsplash.com/@firephotos)
- [César Badilla Miranda](https://unsplash.com/@xbmpro)
- [Jonathan Cooper](https://unsplash.com/@theshuttervision)
- [Behrooz](https://unsplash.com/@behroozrahimi)
- [Oriol Pascual](https://unsplash.com/@oriolpascual)
- [Thibault Lam Tran](https://unsplash.com/@tlamtran_11)

Иконки (`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`) и карта-заглушка нарисованы для проекта.

## Заглушки

Адрес, телефон `+34 600 000 000` и аккаунт `@norte.barberia.demo` — демонстрационные данные. Ссылки на Instagram и «Как добраться» ведут на зарезервированный домен `example.com` (RFC 2606), чтобы демо-сайт не отправлял посетителей на реальные аккаунты и места. `og:image` и `og:url` указывают на адрес GitHub Pages; при переезде на свой домен их нужно обновить.
