import { buildingConfig } from './config.js';
import * as state from './state.js';
import { addBuildingToGrid } from './buildingManager.js'; // Нужен для отрисовки загруженных зданий
import { updateBuildingsList } from './uiManager.js';   // Обновить список после загрузки
import { redrawAllBuildings } from './gridUtils.js';     // Полная перерисовка сетки

// Сохранение состояния в base64 и создание ссылки
export function saveStateToBase64() {
    const stateToSave = state.buildings.map(b => ({
        type: b.type,
        x: b.x,
        y: b.y,
        playerName: b.playerName || '',
        ...(b.type === 'deadzone' ? { width: b.width, height: b.height } : {})
    }));

    try {
        const jsonState = JSON.stringify(stateToSave);
        const base64State = btoa(encodeURIComponent(jsonState)); // encodeURIComponent для символов UTF-8 перед btoa
        const url = `${window.location.origin}${window.location.pathname}#${base64State}`;

        navigator.clipboard.writeText(url).then(() => {
            alert(state.currentLang === 'ru' ? 'Ссылка скопирована в буфер обмена!' : 'Link copied to clipboard!');
        }).catch(err => {
            console.error('Не удалось скопировать ссылку:', err);
            alert(state.currentLang === 'ru' ?
                `Не удалось скопировать ссылку автоматически. Вот ваша ссылка:\n${url}` :
                `Failed to copy link automatically. Here is your link:\n${url}`);
        });
        return url;
    } catch (error) {
        console.error("Ошибка при сохранении состояния:", error);
        alert(state.currentLang === 'ru' ? 'Ошибка при сохранении состояния.' : 'Error saving state.');
        return null;
    }
}

// Загрузка состояния из base64
export function loadStateFromBase64(base64State) {
    try {
        const jsonState = decodeURIComponent(atob(base64State)); // decodeURIComponent после atob
        const loadedBuildingsData = JSON.parse(jsonState);

        const newBuildingsArray = [];
        loadedBuildingsData.forEach(savedBuilding => {
            const config = buildingConfig[savedBuilding.type];
            if (!config) {
                console.warn(`Неизвестный тип здания при загрузке: ${savedBuilding.type}`);
                return;
            }

            const newBuilding = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                type: savedBuilding.type,
                x: savedBuilding.x,
                y: savedBuilding.y,
                playerName: savedBuilding.playerName || '',
                size: config.size,
                areaSize: config.areaSize,
                icon: config.icon,
                width: savedBuilding.type === 'deadzone' ? (savedBuilding.width || config.size) : config.size,
                height: savedBuilding.type === 'deadzone' ? (savedBuilding.height || config.size) : config.size,
            };
            newBuildingsArray.push(newBuilding);
        });

        state.setBuildings(newBuildingsArray); // Обновляем состояние
        state.setSelectedBuilding(null);      // Сбрасываем выделение

        // Перерисовка и обновление UI будут вызваны из app.js после checkLocationHash
        return true;
    } catch (error) {
        console.error('Ошибка при загрузке состояния:', error);
        alert(state.currentLang === 'ru' ? 'Ошибка загрузки состояния из ссылки.' : 'Error loading state from link.');
        return false;
    }
}

// Проверка location hash при загрузке страницы
export function checkLocationHash() {
    if (window.location.hash && window.location.hash.length > 1) {
        const base64State = window.location.hash.slice(1);
        if (loadStateFromBase64(base64State)) {
            // Успешно загружено. Хэш можно оставить, чтобы ссылка оставалась рабочей для копирования.
            // Или очистить: window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }
    }
}