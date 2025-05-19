// persistence.js
// Этот модуль отвечает за сохранение текущего состояния приложения (в основном, размещенных зданий)
// в строку, пригодную для передачи через URL (хэш), и за восстановление состояния из такой строки.
// Используется сжатие pako и сокращение имен ключей для уменьшения размера URL.

import { buildingConfig, translations } from './config.js'; // Конфигурация зданий и строки локализации (для сообщений)
import * as state from './state.js'; // Глобальное состояние приложения
// pako должен быть доступен глобально (например, <script src="libs/pako.min.js"></script> в HTML)
// или импортирован, если используется система сборки: import pako from 'pako';

// --- Карты для сокращения/восстановления типов зданий ---
// Эти карты используются для замены полных имен типов зданий на короткие символы
// в сохраняемом JSON, что помогает уменьшить его размер.
const BUILDING_TYPE_SHORT_MAP = {
    fortress:  'f', outpost: 'o',  hellgates: 'hg',
    hospital:  'hp', farm: 'fm', warehouse: 'wh',
    castle:    'c',  deadzone: 'd'
};
// Обратная карта для восстановления полных типов при загрузке
const REVERSE_BUILDING_TYPE_SHORT_MAP = Object.fromEntries(
    Object.entries(BUILDING_TYPE_SHORT_MAP).map(([key, value]) => [value, key])
);

// --- Константы для сокращенных ключей в сохраняемом JSON ---
// Использование констант для ключей улучшает читаемость и упрощает их изменение.
const KEYS = {
    TYPE:        't', // Тип здания (сокращенный)
    X_COORD:     'x', // Координата X
    Y_COORD:     'y', // Координата Y
    PLAYER_NAME: 'n', // Имя игрока или название зоны (опционально)
    WIDTH:       'w', // Ширина (только для 'deadzone' с измененным размером)
    HEIGHT:      'h', // Высота (только для 'deadzone' с измененным размером)
};

// --- Сохранение состояния ---

/**
 * Сериализует, сжимает и кодирует текущее состояние зданий в Base64 строку для URL.
 * 1. Данные зданий преобразуются в минимальный формат с короткими ключами.
 * 2. Массив этих объектов сериализуется в JSON-строку.
 * 3. JSON-строка сжимается с помощью pako.deflate.
 * 4. Сжатые бинарные данные преобразуются в "бинарную строку".
 * 5. "Бинарная строка" кодируется в Base64.
 * 6. Формируется URL с хэшем и предлагается пользователю (копируется в буфер).
 * @returns {string|null} Сформированный URL с хэшем или null в случае ошибки.
 */
export function saveStateToBase64() {
    // 1. Преобразование данных зданий в минимальный формат
    const buildingsToSave = state.buildings.map(building => {
        const savedObject = {
            [KEYS.TYPE]:    BUILDING_TYPE_SHORT_MAP[building.type] || building.type, // Сокращенный тип
            [KEYS.X_COORD]: building.x,
            [KEYS.Y_COORD]: building.y,
        };
        // Сохраняем имя только если оно не пустое
        if (building.playerName && building.playerName.trim().length > 0) {
            savedObject[KEYS.PLAYER_NAME] = building.playerName.trim();
        }
        // Сохраняем кастомные размеры только для 'deadzone'
        if (building.type === 'deadzone') {
            // Опционально: можно сохранять w/h только если они отличаются от config.size,
            // но для простоты пока сохраняем всегда для deadzone.
            savedObject[KEYS.WIDTH] = building.width;
            savedObject[KEYS.HEIGHT] = building.height;
        }
        return savedObject;
    });

    try {
        // 2. Сериализация в JSON
        const jsonState = JSON.stringify(buildingsToSave);

        // 3. Сжатие JSON-строки с помощью pako
        // pako.deflate возвращает Uint8Array, представляющий сжатые данные.
        const compressedUint8Array = pako.deflate(jsonState);

        // 4. Преобразование Uint8Array в "бинарную строку" для btoa
        // btoa ожидает строку, где каждый символ кодирует один байт (0-255).
        let binaryString = "";
        for (let i = 0; i < compressedUint8Array.length; i++) {
            binaryString += String.fromCharCode(compressedUint8Array[i]);
        }

        // 5. Кодирование "бинарной строки" в Base64
        const base64State = btoa(binaryString);

        // 6. Формирование URL и взаимодействие с пользователем
        const url = `${window.location.origin}${window.location.pathname}#${base64State}`;
        navigator.clipboard.writeText(url).then(() => {
            alert(translations[state.currentLang]?.linkCopied || 'Ссылка скопирована!');
        }).catch(err => {
            console.error('[persistence] Ошибка копирования ссылки в буфер:', err);
            alert((translations[state.currentLang]?.linkCopyFailed || 'Ошибка копирования. Ссылка:') + `\n${url}`);
        });
        return url;

    } catch (error) {
        console.error("[persistence] Ошибка при сохранении/сжатии состояния:", error);
        alert(translations[state.currentLang]?.saveError || 'Ошибка сохранения.');
        return null;
    }
}


// --- Загрузка состояния ---

/**
 * Загружает и восстанавливает состояние зданий из строки Base64 (обычно из URL хэша).
 * Поддерживает два формата:
 * 1. Новый формат: Base64 -> atob -> бинарная строка -> Uint8Array -> pako.inflate -> JSON (с короткими ключами) -> восстановление объектов.
 * 2. Старый формат (для обратной совместимости): Base64 -> atob -> decodeURIComponent -> JSON (с полными ключами) -> восстановление объектов.
 * @param {string} base64StateFromUrl - Закодированная строка состояния.
 * @returns {boolean} - True, если состояние успешно загружено, иначе false.
 */
export function loadStateFromBase64(base64StateFromUrl) {
    try {
        // --- Попытка 1: Загрузка НОВОГО (сжатого pako, с короткими ключами) формата ---
        const binaryString = atob(base64StateFromUrl); // 1. Base64 -> "бинарная строка"

        const compressedUint8Array = new Uint8Array(binaryString.length); // 2. "Бинарная строка" -> Uint8Array
        for (let i = 0; i < binaryString.length; i++) {
            compressedUint8Array[i] = binaryString.charCodeAt(i);
        }

        const jsonStateNewFormat = pako.inflate(compressedUint8Array, { to: 'string' }); // 3. Распаковка в JSON-строку
        const loadedDataNewFormat = JSON.parse(jsonStateNewFormat); // 4. Парсинг JSON

        // 5. Восстановление полных объектов зданий
        const buildingsArray = loadedDataNewFormat.map(savedObj => {
            const fullType = REVERSE_BUILDING_TYPE_SHORT_MAP[savedObj[KEYS.TYPE]] || savedObj[KEYS.TYPE];
            const config = buildingConfig[fullType];
            if (!config) {
                console.warn(`[persistence] (Новый формат) Неизвестный тип здания: '${fullType}' (сокращенный: '${savedObj[KEYS.TYPE]}'). Пропуск.`);
                return null;
            }
            return {
                id: generateNewBuildingId(), // Генерируем новый ID при каждой загрузке
                type: fullType,
                x: savedObj[KEYS.X_COORD],
                y: savedObj[KEYS.Y_COORD],
                playerName: savedObj[KEYS.PLAYER_NAME] || '',
                size: config.size,                  // Восстанавливаем из конфига
                areaSize: config.areaSize,          // Восстанавливаем из конфига
                icon: config.icon,                  // Восстанавливаем из конфига
                width: fullType === 'deadzone' ? (savedObj[KEYS.WIDTH] ?? config.size) : config.size,
                height: fullType === 'deadzone' ? (savedObj[KEYS.HEIGHT] ?? config.size) : config.size,
            };
        }).filter(building => building !== null); // Удаляем null значения (пропущенные здания)

        updateStateWithLoadedBuildings(buildingsArray);
        console.info("[persistence] Состояние успешно загружено в новом (сжатом) формате.");
        return true;

    } catch (errorNewFormat) {
        console.warn('[persistence] Ошибка при загрузке в новом формате. Попытка загрузить старый формат...', errorNewFormat);

        try {
            // --- Попытка 2: Загрузка СТАРОГО (несжатого, с полными ключами) формата ---
            const jsonStateOldFormat = decodeURIComponent(atob(base64StateFromUrl));
            const loadedDataOldFormat = JSON.parse(jsonStateOldFormat);

            if (!Array.isArray(loadedDataOldFormat)) { // Базовая проверка формата
                throw new Error("Старый формат данных должен быть массивом объектов зданий.");
            }

            const buildingsArray = loadedDataOldFormat.map(savedObj => {
                const type = savedObj.type; // В старом формате ключи были полными
                const config = buildingConfig[type];
                if (!config) {
                    console.warn(`[persistence] (Старый формат) Неизвестный тип здания: '${type}'. Пропуск.`);
                    return null;
                }
                return {
                    id: generateNewBuildingId(),
                    type: type,
                    x: savedObj.x,
                    y: savedObj.y,
                    playerName: savedObj.playerName || '',
                    size: config.size,       // Данные из конфига для консистентности
                    areaSize: config.areaSize,
                    icon: config.icon,
                    width: type === 'deadzone' ? (savedObj.width || config.size) : config.size,
                    height: type === 'deadzone' ? (savedObj.height || config.size) : config.size,
                };
            }).filter(building => building !== null);

            updateStateWithLoadedBuildings(buildingsArray);
            console.info("[persistence] Состояние успешно загружено в старом (несжатом) формате.");
            return true;

        } catch (errorOldFormat) {
            console.error('[persistence] Ошибка при загрузке состояния и в старом формате:', errorOldFormat);
            alert(translations[state.currentLang]?.loadErrorCorrupted || 'Ошибка загрузки: данные повреждены или формат неизвестен.');
            return false;
        }
    }
}

/**
 * Проверяет URL хэш при загрузке страницы и, если он присутствует, пытается загрузить из него состояние.
 */
export function checkLocationHash() {
    if (window.location.hash && window.location.hash.length > 1) { // Хэш должен быть не просто '#'
        const base64State = window.location.hash.slice(1); // Удаляем символ '#'
        if (loadStateFromBase64(base64State)) {
            // Успешная загрузка.
            // Очистка хэша после загрузки (опционально):
            // window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }
    }
}

// --- Вспомогательные функции модуля ---

/**
 * Генерирует простой уникальный ID для нового здания.
 * @returns {string} Уникальный ID.
 */
function generateNewBuildingId() {
    // Комбинация времени и случайной строки для повышения уникальности в рамках сессии.
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

/**
 * Обновляет глобальное состояние приложения загруженными зданиями.
 * @param {Array<Object>} buildingsArray - Массив восстановленных объектов зданий.
 */
function updateStateWithLoadedBuildings(buildingsArray) {
    state.setBuildings(buildingsArray);
    state.setSelectedBuilding(null); // Сбрасываем выделение после загрузки нового состояния
    // Дальнейшее обновление UI (redrawAllBuildings, updateBuildingsList) должно происходить в app.js
    // после вызова checkLocationHash.
}