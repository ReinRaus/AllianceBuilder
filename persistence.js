import { buildingConfig, translations } from './config.js'; // `translations` для сообщений об ошибках
import * as state from './state.js';
// `pako` предполагается доступным глобально (например, через CDN <script src="pako.min.js"></script>)
// или импортированным, если используется система сборки: import pako from 'pako';

// --- Карты для сокращения/восстановления типов зданий ---
// Используются для уменьшения размера сохраняемых данных.
const BUILDING_TYPE_SHORT_MAP = { // Имя изменено для ясности
    fortress: 'f',    outpost: 'o',     hellgates: 'hg',
    hospital: 'hp',   farm: 'fm',       warehouse: 'wh',
    castle: 'c',      deadzone: 'd'
};

const REVERSE_BUILDING_TYPE_SHORT_MAP = Object.fromEntries( // Имя изменено
    Object.entries(BUILDING_TYPE_SHORT_MAP).map(([key, value]) => [value, key])
);

// --- Ключи для сохраняемых/загружаемых данных ---
// Позволяет легко изменить сокращения в одном месте.
const KEYS = {
    TYPE: 't',          // Тип здания
    X_COORD: 'x',       // Координата X
    Y_COORD: 'y',       // Координата Y
    PLAYER_NAME: 'n',   // Имя игрока/название зоны
    WIDTH: 'w',         // Ширина (для deadzone)
    HEIGHT: 'h',        // Высота (для deadzone)
};


// --- Сохранение состояния ---

/**
 * Сохраняет текущее состояние зданий в компактном формате Base64.
 * Процесс:
 * 1. Преобразование данных зданий в минимальный формат с короткими ключами.
 * 2. Сериализация в JSON.
 * 3. Сжатие JSON-строки с помощью pako.
 * 4. Кодирование сжатых данных в Base64.
 * 5. Формирование URL и копирование в буфер обмена.
 * @returns {string|null} URL с сохраненным состоянием или null в случае ошибки.
 */
export function saveStateToBase64() {
    // 1. Подготовка данных для сохранения (минимальный набор с короткими ключами)
    const buildingsToSave = state.buildings.map(building => {
        const savedObject = {
            [KEYS.TYPE]: BUILDING_TYPE_SHORT_MAP[building.type] || building.type, // Сокращаем тип
            [KEYS.X_COORD]: building.x,
            [KEYS.Y_COORD]: building.y,
        };

        if (building.playerName && building.playerName.length > 0) {
            savedObject[KEYS.PLAYER_NAME] = building.playerName;
        }

        if (building.type === 'deadzone') {
            savedObject[KEYS.WIDTH] = building.width;
            savedObject[KEYS.HEIGHT] = building.height;
        }
        return savedObject;
    });

    try {
        // 2. Сериализация в JSON
        const jsonState = JSON.stringify(buildingsToSave);
        // console.debug("JSON для сохранения (перед сжатием):", jsonState, "Длина:", jsonState.length);

        // 3. Сжатие JSON-строки с помощью pako.deflate
        // pako.deflate возвращает Uint8Array.
        const compressedUint8Array = pako.deflate(jsonState);
        // console.debug("Сжатый Uint8Array, длина:", compressedUint8Array.length);

        // Преобразуем Uint8Array в "бинарную строку" для btoa.
        // Каждый байт из Uint8Array становится символом в строке.
        let binaryString = "";
        for (let i = 0; i < compressedUint8Array.length; i++) {
            binaryString += String.fromCharCode(compressedUint8Array[i]);
        }

        // 4. Кодирование бинарной строки в Base64
        const base64State = btoa(binaryString);
        // console.debug("Итоговая Base64 строка, длина:", base64State.length);

        // 5. Формирование URL и копирование
        const url = `${window.location.origin}${window.location.pathname}#${base64State}`;
        navigator.clipboard.writeText(url).then(() => {
            alert(translations[state.currentLang]?.linkCopied || 
                  (state.currentLang === 'ru' ? 'Ссылка скопирована в буфер обмена!' : 'Link copied to clipboard!'));
        }).catch(err => {
            console.error('Не удалось скопировать ссылку:', err);
            alert(translations[state.currentLang]?.linkCopyFailed || 
                  (state.currentLang === 'ru' ? `Не удалось скопировать ссылку автоматически. Вот ваша ссылка:\n${url}` : `Failed to copy link automatically. Here is your link:\n${url}`));
        });
        return url;

    } catch (error) {
        console.error("Ошибка при сохранении/сжатии состояния:", error);
        alert(translations[state.currentLang]?.saveError || 
              (state.currentLang === 'ru' ? 'Ошибка при сохранении состояния.' : 'Error saving state.'));
        return null;
    }
}


// --- Загрузка состояния ---

/**
 * Загружает состояние зданий из строки Base64 (из URL хэша).
 * Пытается сначала загрузить новый (сжатый, с короткими ключами) формат.
 * В случае неудачи, пытается загрузить старый (несжатый, с полными ключами) формат.
 * @param {string} base64StateFromUrl Строка Base64.
 * @returns {boolean} True, если загрузка успешна, иначе false.
 */
export function loadStateFromBase64(base64StateFromUrl) {
    try {
        // --- Попытка 1: Загрузка НОВОГО (сжатого pako, с короткими ключами) формата ---
        // 1. Декодируем Base64 в "бинарную строку"
        const binaryString = atob(base64StateFromUrl);

        // 2. Преобразуем "бинарную строку" в Uint8Array
        const compressedUint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            compressedUint8Array[i] = binaryString.charCodeAt(i);
        }

        // 3. Распаковываем Uint8Array в исходную JSON-строку (которая содержит короткие ключи)
        const jsonStateNewFormat = pako.inflate(compressedUint8Array, { to: 'string' });
        // console.debug("Распакованный JSON (новый формат):", jsonStateNewFormat);

        // 4. Парсим JSON
        const loadedDataNewFormat = JSON.parse(jsonStateNewFormat);

        // 5. Восстанавливаем полные объекты зданий из данных с короткими ключами
        const buildingsArray = loadedDataNewFormat.map(savedObj => {
            const fullType = REVERSE_BUILDING_TYPE_SHORT_MAP[savedObj[KEYS.TYPE]] || savedObj[KEYS.TYPE];
            const config = buildingConfig[fullType];
            if (!config) {
                console.warn(`(Новый формат) Неизвестный тип здания: '${fullType}' (сокращенный: '${savedObj[KEYS.TYPE]}')`);
                return null; // Для последующей фильтрации
            }
            return {
                id: generateNewBuildingId(), // Генерируем новый ID
                type: fullType,
                x: savedObj[KEYS.X_COORD],
                y: savedObj[KEYS.Y_COORD],
                playerName: savedObj[KEYS.PLAYER_NAME] || '',
                size: config.size,
                areaSize: config.areaSize,
                icon: config.icon,
                width: fullType === 'deadzone' ? (savedObj[KEYS.WIDTH] !== undefined ? savedObj[KEYS.WIDTH] : config.size) : config.size,
                height: fullType === 'deadzone' ? (savedObj[KEYS.HEIGHT] !== undefined ? savedObj[KEYS.HEIGHT] : config.size) : config.size,
            };
        }).filter(Boolean); // Удаляем null значения, если были неизвестные типы

        state.setBuildings(buildingsArray);
        state.setSelectedBuilding(null);
        console.info("Состояние успешно загружено в новом (сжатом) формате.");
        return true;

    } catch (errorNewFormat) {
        console.warn('Ошибка при загрузке в новом формате, попытка загрузить старый формат...', errorNewFormat);

        try {
            // --- Попытка 2: Загрузка СТАРОГО (несжатого, с полными ключами) формата ---
            // 1. Декодирование Base64 -> decodeURIComponent -> JSON.parse
            const jsonStateOldFormat = decodeURIComponent(atob(base64StateFromUrl));
            const loadedDataOldFormat = JSON.parse(jsonStateOldFormat);

            if (!Array.isArray(loadedDataOldFormat)) {
                throw new Error("Старый формат данных должен быть массивом.");
            }

            const buildingsArray = loadedDataOldFormat.map(savedObj => {
                const type = savedObj.type; // В старом формате ключ был 'type'
                const config = buildingConfig[type];
                if (!config) {
                    console.warn(`(Старый формат) Неизвестный тип здания: '${type}'`);
                    return null;
                }
                return {
                    id: generateNewBuildingId(), // Генерируем новый ID
                    type: type,
                    x: savedObj.x,
                    y: savedObj.y,
                    playerName: savedObj.playerName || '',
                    size: config.size,       // Данные из конфига для консистентности
                    areaSize: config.areaSize,   // (даже если они были в старом сохранении)
                    icon: config.icon,
                    width: type === 'deadzone' ? (savedObj.width || config.size) : config.size,
                    height: type === 'deadzone' ? (savedObj.height || config.size) : config.size,
                };
            }).filter(Boolean);

            state.setBuildings(buildingsArray);
            state.setSelectedBuilding(null);
            console.info("Состояние успешно загружено в старом (несжатом) формате.");
            return true;

        } catch (errorOldFormat) {
            console.error('Ошибка при загрузке состояния и в старом формате:', errorOldFormat);
            alert(translations[state.currentLang]?.loadErrorCorrupted ||
                  (state.currentLang === 'ru' ? 'Ошибка загрузки: данные повреждены или неизвестный формат.' : 'Load error: data corrupted or unknown format.'));
            return false;
        }
    }
}

/**
 * Проверяет URL хэш при загрузке страницы и пытается загрузить из него состояние.
 */
export function checkLocationHash() {
    if (window.location.hash && window.location.hash.length > 1) { // Убедимся, что хэш не просто '#'
        const base64State = window.location.hash.slice(1);
        if (loadStateFromBase64(base64State)) {
            // Успешная загрузка. Можно очистить хэш, если это предпочтительно:
            // window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }
    }
}

// --- Вспомогательные функции ---

/** Генерирует уникальный ID для здания. */
function generateNewBuildingId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}