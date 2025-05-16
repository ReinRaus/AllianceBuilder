import { buildingConfig } from './config.js';
import * as state from './state.js';
import { addBuildingToGrid } from './buildingManager.js';
import { updateBuildingsList } from './uiManager.js';
// redrawAllBuildings не используется напрямую в этом модуле, но важно, что он вызывается в app.js после загрузки.

// --- Сохранение и загрузка состояния приложения ---

/**
 * Сохраняет текущее состояние размещенных зданий в строку Base64 и копирует URL с этой строкой в буфер обмена.
 * @returns {string|null} URL с сохраненным состоянием или null в случае ошибки.
 */
export function saveStateToBase64() {
    // Собираем только необходимые данные о зданиях для сохранения
    const stateToSave = state.buildings.map(b => ({
        type: b.type,
        x: b.x,
        y: b.y,
        playerName: b.playerName || '',
        // Сохраняем кастомные размеры для мертвых зон
        ...(b.type === 'deadzone' ? { width: b.width, height: b.height } : {})
    }));

    try {
        const jsonState = JSON.stringify(stateToSave);
        // encodeURIComponent перед btoa для корректной обработки UTF-8 символов (например, в именах)
        const base64State = btoa(encodeURIComponent(jsonState));
        const url = `${window.location.origin}${window.location.pathname}#${base64State}`;

        navigator.clipboard.writeText(url).then(() => {
            alert(translations[state.currentLang]?.linkCopied || // POTENTIAL_ISSUE: Ключ linkCopied отсутствует
                  (state.currentLang === 'ru' ? 'Ссылка скопирована в буфер обмена!' : 'Link copied to clipboard!'));
        }).catch(err => {
            console.error('Не удалось скопировать ссылку:', err);
            alert(translations[state.currentLang]?.linkCopyFailed || // POTENTIAL_ISSUE: Ключ linkCopyFailed отсутствует
                  (state.currentLang === 'ru' ?
                  `Не удалось скопировать ссылку автоматически. Вот ваша ссылка:\n${url}` :
                  `Failed to copy link automatically. Here is your link:\n${url}`));
        });
        return url;
    } catch (error) {
        console.error("Ошибка при сохранении состояния:", error);
        alert(translations[state.currentLang]?.saveError || // POTENTIAL_ISSUE: Ключ saveError отсутствует
              (state.currentLang === 'ru' ? 'Ошибка при сохранении состояния.' : 'Error saving state.'));
        return null;
    }
}

/**
 * Загружает состояние зданий из строки Base64.
 * @param {string} base64State Строка Base64, содержащая сохраненное состояние.
 * @returns {boolean} True в случае успешной загрузки, иначе false.
 */
export function loadStateFromBase64(base64StateFromUrl) { // Переименовал параметр для ясности
    try {
        // decodeURIComponent после atob
        const jsonState = decodeURIComponent(atob(base64StateFromUrl));
        const loadedBuildingsData = JSON.parse(jsonState);

        const newBuildingsArray = [];
        loadedBuildingsData.forEach(savedBuilding => {
            const config = buildingConfig[savedBuilding.type];
            if (!config) {
                console.warn(`Неизвестный тип здания при загрузке: ${savedBuilding.type}`);
                return; // Пропускаем неизвестное здание
            }

            // Восстанавливаем объект здания
            const newBuilding = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // Генерируем новый ID
                type: savedBuilding.type,
                x: savedBuilding.x,
                y: savedBuilding.y,
                playerName: savedBuilding.playerName || '',
                size: config.size, // Базовый размер из конфига
                areaSize: config.areaSize,
                icon: config.icon,
                // Восстанавливаем кастомные размеры для мертвой зоны, если они были сохранены
                width: savedBuilding.type === 'deadzone' ? (savedBuilding.width || config.size) : config.size,
                height: savedBuilding.type === 'deadzone' ? (savedBuilding.height || config.size) : config.size,
            };
            newBuildingsArray.push(newBuilding);
        });

        state.setBuildings(newBuildingsArray); // Обновляем глобальное состояние зданий
        state.setSelectedBuilding(null);      // Сбрасываем текущее выделение

        // Важно: сама перерисовка (redrawAllBuildings, updateBuildingsList) должна быть вызвана
        // в app.js после того, как checkLocationHash отработает, чтобы гарантировать,
        // что DOM готов и все UI элементы обновлены с учетом нового состояния.
        return true;
    } catch (error) {
        console.error('Ошибка при загрузке состояния:', error);
        alert(translations[state.currentLang]?.loadError || // POTENTIAL_ISSUE: Ключ loadError отсутствует
              (state.currentLang === 'ru' ? 'Ошибка загрузки состояния из ссылки.' : 'Error loading state from link.'));
        return false;
    }
}

/**
 * Проверяет наличие хэша в URL при загрузке страницы и пытается загрузить из него состояние.
 */
export function checkLocationHash() {
    if (window.location.hash && window.location.hash.length > 1) { // Убедимся, что хэш не пустой (#)
        const base64State = window.location.hash.slice(1); // Удаляем символ #
        if (loadStateFromBase64(base64State)) {
            // Состояние успешно загружено.
            // Можно очистить хэш, чтобы URL выглядел чище, если пользователь начнет редактировать.
            // window.history.replaceState(null, null, window.location.pathname + window.location.search);
            // Но оставление хэша позволяет легко скопировать URL с состоянием снова.
        }
    }
}