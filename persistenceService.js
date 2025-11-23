// persistenceService.js
// Этот модуль отвечает за сохранение текущего состояния приложения (в основном, размещенных зданий)
// в строку, пригодную для передачи через URL (хэш), и за восстановление состояния из такой строки.
// Используется сокращение имен ключей и сжатие pako для уменьшения размера URL.

// Глобальные объекты (доступны после подключения скриптов в index.html)
// window.appBuildingConfig, window.appTranslations, window.pako

// --- Карты для сокращения/восстановления типов зданий ---
// Эти карты используются для замены полных имен типов зданий на короткие символы
// в сохраняемом JSON, что помогает уменьшить его размер.
const BUILDING_TYPE_SHORT_MAP_PERSIST = {
    fortress:  'f', outpost: 'o',  hellgates: 'hg', // 'h' зарезервировано для 'height'
    hospital:  'hp', farm: 'fm', warehouse: 'wh', // 'w' зарезервировано для 'width'
    castle:    'c',  deadzone: 'd'
};
// Обратная карта для восстановления полных типов при загрузке
const REVERSE_BUILDING_TYPE_SHORT_MAP_PERSIST = Object.fromEntries(
    Object.entries(BUILDING_TYPE_SHORT_MAP_PERSIST).map(([key, value]) => [value, key])
);

// --- Константы для сокращенных ключей в сохраняемом JSON ---
// Использование констант для ключей улучшает читаемость и упрощает их изменение.
const PERSIST_KEYS = {
    TYPE:        't', // Тип здания (сокращенный)
    X_COORD:     'x', // Координата X
    Y_COORD:     'y', // Координата Y
    PLAYER_NAME: 'n', // Имя игрока или название зоны (опционально, от 'name')
    WIDTH:       'w', // Ширина (только для 'deadzone' с измененным размером)
    HEIGHT:      'h', // Высота (только для 'deadzone' с измененным размером)
};

// Помещаем сервис в глобальный объект window.appPersistenceService
// для доступа из других частей приложения (например, App.js) без явных импортов,
// что удобно при использовании Babel Standalone.
window.appPersistenceService = {
    /**
     * Сохраняет текущее состояние зданий в компактном формате Base64 для URL.
     * Процесс:
     * 1. Преобразование данных зданий в минимальный формат с короткими ключами.
     * 2. Сериализация в JSON.
     * 3. Сжатие JSON-строки с помощью pako.deflate.
     * 4. Преобразование сжатых бинарных данных (Uint8Array) в "бинарную строку".
     * 5. Кодирование "бинарной строки" в Base64.
     * 6. Формирование URL с хэшем и копирование в буфер обмена.
     * @param {Array<Object>} buildings - Текущий массив объектов зданий из состояния.
     * @param {string} currentLang - Текущий язык интерфейса для отображения сообщений.
     * @returns {string|null} Сформированный URL с хэшем или null в случае ошибки.
     */
    saveStateToBase64: function(buildings, currentLang) {
        // 1. Подготовка данных для сохранения: только необходимые поля с сокращенными ключами.
        const buildingsToSave = buildings.map(building => {
            const savedObject = {
                [PERSIST_KEYS.TYPE]:    BUILDING_TYPE_SHORT_MAP_PERSIST[building.type] || building.type,
                [PERSIST_KEYS.X_COORD]: building.x,
                [PERSIST_KEYS.Y_COORD]: building.y,
            };
            // Сохраняем имя только если оно не пустое и не состоит только из пробелов.
            if (building.playerName && building.playerName.trim().length > 0) {
                savedObject[PERSIST_KEYS.PLAYER_NAME] = building.playerName.trim();
            }
            // Сохраняем кастомные размеры только для зданий типа 'deadzone'.
            if (building.type === window.appConstants.BUILDING_TYPES.DEADZONE) {
                savedObject[PERSIST_KEYS.WIDTH] = building.width;
                savedObject[PERSIST_KEYS.HEIGHT] = building.height;
            }
            return savedObject;
        });

        try {
            // 2. Сериализация подготовленных данных в JSON-строку.
            const jsonState = JSON.stringify(buildingsToSave);
            // console.debug("[Persistence] JSON для сохранения (перед сжатием):", jsonState, "Длина:", jsonState.length);

            // 3. Сжатие JSON-строки с помощью pako.
            // pako.deflate возвращает Uint8Array, представляющий сжатые данные.
            const compressedUint8Array = window.pako.deflate(jsonState);
            // console.debug("[Persistence] Сжатый Uint8Array, длина:", compressedUint8Array.length);

            // 4. Преобразование Uint8Array в "бинарную строку" (строку из однобайтовых символов),
            // так как функция btoa ожидает именно такой формат.
            let binaryString = "";
            for (let i = 0; i < compressedUint8Array.length; i++) {
                binaryString += String.fromCharCode(compressedUint8Array[i]);
            }

            // 5. Кодирование "бинарной строки" в Base64.
            const base64State = btoa(binaryString);
            // console.debug("[Persistence] Итоговая Base64 строка, длина:", base64State.length);

            // 6. Формирование полного URL с хэшем и взаимодействие с пользователем.
            const url = `${window.location.origin}${window.location.pathname}#${base64State}`;
            navigator.clipboard.writeText(url).then(() => {
                alert(window.appTranslations.t('linkCopied', currentLang));
            }).catch(err => {
                console.error('[Persistence] Ошибка копирования ссылки в буфер обмена:', err);
                // Предоставляем пользователю ссылку, если автоматическое копирование не удалось.
                alert(`${window.appTranslations.t('linkCopyFailed', currentLang)}\n${url}`);
            });
            return url; // Возвращаем сформированный URL

        } catch (error) {
            console.error("[Persistence] Ошибка при сохранении или сжатии состояния:", error);
            alert(window.appTranslations.t('saveError', currentLang));
            return null; // Возвращаем null в случае ошибки
        }
    },

    /**
     * Загружает и восстанавливает состояние зданий из строки Base64 (обычно из URL хэша).
     * Поддерживает два формата для обратной совместимости:
     * 1. Новый формат: Base64 -> atob -> "бинарная строка" -> Uint8Array -> pako.inflate -> JSON (с короткими ключами) -> восстановление объектов.
     * 2. Старый формат: Base64 -> atob -> decodeURIComponent -> JSON (с полными ключами и всеми полями) -> восстановление объектов.
     * @param {string} base64StateFromUrl - Закодированная строка состояния из URL.
     * @param {string} currentLang - Текущий язык интерфейса для отображения сообщений об ошибках.
     * @returns {Array<Object>|null} Массив восстановленных объектов зданий или null в случае полной неудачи.
     */
    loadStateFromBase64: function(base64StateFromUrl, currentLang) {
        try {
            // --- Попытка 1: Загрузка НОВОГО (сжатого pako, с короткими ключами) формата ---
            // 1. Декодируем Base64 в "бинарную строку"
            const binaryString = atob(base64StateFromUrl);

            // 2. Преобразуем "бинарную строку" обратно в Uint8Array
            const compressedUint8Array = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                compressedUint8Array[i] = binaryString.charCodeAt(i);
            }

            // 3. Распаковываем Uint8Array в исходную JSON-строку (которая содержит короткие ключи)
            const jsonStateNewFormat = window.pako.inflate(compressedUint8Array, { to: 'string' });
            const loadedDataNewFormat = JSON.parse(jsonStateNewFormat); // 4. Парсим JSON

            // 5. Восстанавливаем полные объекты зданий из данных с короткими ключами
            const buildingsArray = loadedDataNewFormat.map(savedObj => {
                const fullType = REVERSE_BUILDING_TYPE_SHORT_MAP_PERSIST[savedObj[PERSIST_KEYS.TYPE]] || savedObj[PERSIST_KEYS.TYPE];
                const config = window.appBuildingConfig[fullType];
                if (!config) {
                    console.warn(`[Persistence] (Новый формат) Неизвестный тип здания: '${fullType}' (сокращенный: '${savedObj[PERSIST_KEYS.TYPE]}'). Пропуск.`);
                    return null; // Для последующей фильтрации
                }
                return {
                    id: this.generateNewBuildingIdInternal(), // Генерируем новый ID
                    type: fullType,
                    x: savedObj[PERSIST_KEYS.X_COORD],
                    y: savedObj[PERSIST_KEYS.Y_COORD],
                    playerName: savedObj[PERSIST_KEYS.PLAYER_NAME] || '',
                    size: config.size,                  // Восстанавливаем из конфига
                    areaSize: config.areaSize,          // Восстанавливаем из конфига
                    icon: config.icon,                  // Восстанавливаем из конфига
                    // Для deadzone, если w/h были сохранены, используем их, иначе из конфига (config.size)
                    width: fullType === window.appConstants.BUILDING_TYPES.DEADZONE ? (savedObj[PERSIST_KEYS.WIDTH] ?? config.size) : config.size,
                    height: fullType === window.appConstants.BUILDING_TYPES.DEADZONE ? (savedObj[PERSIST_KEYS.HEIGHT] ?? config.size) : config.size,
                };
            }).filter(building => building !== null); // Удаляем null значения (пропущенные/неизвестные здания)

            console.info("[Persistence] Состояние успешно загружено в новом (сжатом) формате.");
            return buildingsArray;

        } catch (errorNewFormat) {
            // Если загрузка в новом формате не удалась, выводим предупреждение и пытаемся загрузить старый формат
            console.warn('[Persistence] Ошибка при загрузке в новом формате. Попытка загрузить старый формат...', errorNewFormat);

            try {
                // --- Попытка 2: Загрузка СТАРОГО (несжатого, с полными ключами и всеми полями) формата ---
                // 1. Декодирование Base64 -> decodeURIComponent (для корректной обработки UTF-8 в старом формате) -> JSON.parse
                const jsonStateOldFormat = decodeURIComponent(atob(base64StateFromUrl));
                const loadedDataOldFormat = JSON.parse(jsonStateOldFormat);

                // Базовая проверка, что данные старого формата являются массивом
                if (!Array.isArray(loadedDataOldFormat)) {
                    throw new Error("Данные старого формата должны быть массивом объектов зданий.");
                }

                const buildingsArray = loadedDataOldFormat.map(savedObj => {
                    const type = savedObj.type; // В старом формате ключ для типа здания был 'type'
                    const config = window.appBuildingConfig[type];
                    if (!config) {
                        console.warn(`[Persistence] (Старый формат) Неизвестный тип здания: '${type}'. Пропуск.`);
                        return null;
                    }
                    // Формируем объект здания, используя данные из сохраненного объекта.
                    // ID генерируем новый. size, icon, areaSize берем из актуального конфига
                    // для обеспечения консистентности, даже если они были сохранены в старом формате.
                    return {
                        id: this.generateNewBuildingIdInternal(),
                        type: type,
                        x: savedObj.x,
                        y: savedObj.y,
                        playerName: savedObj.playerName || '',
                        size: config.size,
                        areaSize: config.areaSize,
                        icon: config.icon,
                        width: type === window.appConstants.BUILDING_TYPES.DEADZONE ? (savedObj.width || config.size) : config.size,
                        height: type === window.appConstants.BUILDING_TYPES.DEADZONE ? (savedObj.height || config.size) : config.size,
                    };
                }).filter(building => building !== null);

                console.info("[Persistence] Состояние успешно загружено в старом (несжатом) формате.");
                return buildingsArray;

            } catch (errorOldFormat) {
                // Если и загрузка в старом формате не удалась, выводим ошибку и возвращаем null.
                console.error('[Persistence] Ошибка при загрузке состояния и в старом формате тоже:', errorOldFormat);
                alert(window.appTranslations.t('loadErrorCorrupted', currentLang));
                return null;
            }
        }
    },

    /**
     * Проверяет URL хэш при загрузке страницы и, если он присутствует, пытается загрузить из него состояние.
     * @param {string} currentLang - Текущий язык интерфейса для сообщений об ошибках.
     * @returns {Array<Object>|null} Массив восстановленных объектов зданий или null, если хэш отсутствует или загрузка не удалась.
     */
    checkLocationHashAndLoad: function(currentLang) {
        // Проверяем, что хэш существует и он не просто символ '#'
        if (window.location.hash && window.location.hash.length > 1) {
            const base64State = window.location.hash.slice(1); // Удаляем символ '#' из начала строки
            return this.loadStateFromBase64(base64State, currentLang); // Вызываем основную функцию загрузки
        }
        return null; // Хэш отсутствует или пуст
    },

    /**
     * Вспомогательная функция для генерации уникального ID для нового здания при загрузке.
     * @returns {string} Уникальный ID.
     */
    generateNewBuildingIdInternal: function() {
        // Комбинация текущего времени (в base36) и случайной строки для повышения уникальности.
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    }
};