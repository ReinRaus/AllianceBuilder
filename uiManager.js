// uiManager.js
// Этот модуль отвечает за управление различными аспектами пользовательского интерфейса,
// такими как отображение и скрытие модальных окон,
// локализация текстовых элементов, адаптация под размер экрана и обновление
// визуального состояния кнопок управления режимами и панели инструментов выделенного здания.

import { translations, buildingConfig } from './config.js'; // Конфигурация для локализации и данных о зданиях
import * as state from './state.js'; // Глобальное состояние для currentLang, selectedBuilding и т.д.
// Функции из buildingManager для взаимодействия (выделение, удаление)
import { selectBuilding as selectBuildingInManager, deleteBuilding as deleteBuildingInManager } from './buildingManager.js';
// updateBuildingData из buildingManager здесь не нужен, т.к. переименование происходит через модалку и затем app.js вызывает updateBuildingInManager

// --- Управление модальными окнами ---

/**
 * Показывает модальное окно для ввода имени. Используется при создании замка или мертвой зоны.
 * @param {number} x - Координата X (в ячейках) для потенциального нового здания.
 * @param {number} y - Координата Y (в ячейках) для потенциального нового здания.
 * @param {string} [type='castle'] - Тип здания ('castle' или 'deadzone'), для которого запрашивается имя.
 */
export function showPlayerNameModal(x, y, type = 'castle') {
    const modal = document.getElementById('playerNameModal');
    if (!modal) {
        console.error("[uiManager] Модальное окно 'playerNameModal' не найдено.");
        return;
    }

    modal.dataset.x = x;
    modal.dataset.y = y;
    modal.dataset.buildingType = type;

    const modalTitleEl = modal.querySelector('#modal-title');
    const playerNameInputEl = document.getElementById('playerNameInput');

    if (type === 'deadzone') {
        modalTitleEl.textContent = translations[state.currentLang]?.renameDeadZoneModalTitle ||
                                   (state.currentLang === 'ru' ? "Название зоны" : "Zone Name");
        playerNameInputEl.placeholder = translations[state.currentLang]?.deadZoneNamePlaceholder ||
                                          (state.currentLang === 'ru' ? "Введите название зоны" : "Enter zone name");
    } else { // 'castle'
        modalTitleEl.textContent = translations[state.currentLang]?.modalTitle ||
                                   (state.currentLang === 'ru' ? "Имя игрока" : "Player Name");
        playerNameInputEl.placeholder = translations[state.currentLang]?.playerName ||
                                          (state.currentLang === 'ru' ? "Имя игрока" : "Player Name");
    }
    playerNameInputEl.value = '';
    modal.style.display = 'block';
    playerNameInputEl.focus();
}

/**
 * Показывает модальное окно для переименования существующего здания (замка или мертвой зоны).
 * @param {string} buildingId - ID здания, которое нужно переименовать.
 */
export function showRenameModal(buildingId) {
    const building = state.buildings.find(b => b.id === buildingId);
    if (!building) {
        console.warn(`[uiManager] Здание с ID '${buildingId}' не найдено для переименования.`);
        return;
    }

    const modal = document.getElementById('renameModal');
    if (!modal) {
        console.error("[uiManager] Модальное окно 'renameModal' не найдено.");
        return;
    }

    modal.dataset.buildingId = buildingId;
    const renameInputEl = document.getElementById('renameInput');
    renameInputEl.value = building.playerName || '';

    const renameModalTitleEl = modal.querySelector('#rename-modal-title');
    if (building.type === 'deadzone') {
        renameModalTitleEl.textContent = translations[state.currentLang]?.renameDeadZoneModalTitle ||
                                           (state.currentLang === 'ru' ? "Переименовать зону" : "Rename Zone");
    } else { // 'castle'
        renameModalTitleEl.textContent = translations[state.currentLang]?.renameModalTitle ||
                                           (state.currentLang === 'ru' ? "Переименовать замок" : "Rename Castle");
    }
    modal.style.display = 'block';
    renameInputEl.focus();
}


// --- Обновление динамических частей интерфейса ---

// ФУНКЦИЯ updateBuildingsList() БЫЛА УДАЛЕНА, так как список зданий как отдельная панель упразднен.
// Информация о выделенном здании теперь управляется через updateSelectedBuildingToolbar.

/** Обновляет все текстовые элементы интерфейса в соответствии с текущим выбранным языком. */
export function updateLanguage() {
    document.title = translations[state.currentLang]?.title || "Buildings Planner";

    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.dataset.key;
        const translation = translations[state.currentLang]?.[key];
        if(key=="averageDistance") console.log(state.currentLang);
        
        if (translation !== undefined) {
            const textSpan = el.querySelector('.text'); // Для кнопок с иконкой и текстом
            if (textSpan && (el.classList.contains('toolbar-action-btn') || el.classList.contains('sidebar-btn'))) {
                textSpan.textContent = translation;
            } else if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        }
    });

    // Обновление названий зданий в десктопной панели инструментов
    document.querySelectorAll('.toolbar.desktop-only .building-item .building-name').forEach(el => {
        const buildingTypeKey = el.dataset.key;
        if (buildingTypeKey && translations[state.currentLang]?.[buildingTypeKey]) {
            el.textContent = translations[state.currentLang][buildingTypeKey];
        }
    });
    // На мобильных тултипы и aria-label обновляются в app.js -> populateMobileToolbarSlider

    updateSelectedBuildingToolbar(); // Обновить текст на кнопках панели выделенного здания
    updateRotateButtonVisualState(); // Обновить текст и состояние кнопок поворота
    updateDistanceToHGButtonVisualState(); // Обновить состояние кнопок "До Врат"

    if (state.showDistanceToHG) {
        updateCastleDistanceDisplay(); // Обновить расстояния (единицы измерения могли измениться)
    }

    updateAverageDistanceDisplay(); // Обновить отображение среднего расстояния

    checkScreenSize(); // Применить адаптивные стили
}

/** Обновляет отображение информации на замках (имя или расстояние до Адских Врат). */
export function updateCastleDistanceDisplay() {
    const hellGatesArray = state.buildings.filter(b => b.type === 'hellgates');
    const hellGates = hellGatesArray.length > 0 ? hellGatesArray[0] : null;

    state.buildings.forEach(building => {
        if (building.type === 'castle') {
            const buildingEl = document.getElementById(`building-${building.id}`);
            if (!buildingEl) return;

            let nameEl = buildingEl.querySelector('.player-castle-name');
            if (!nameEl) { // Если элемента для имени нет, создаем его
                nameEl = document.createElement('div');
                nameEl.className = 'player-castle-name';
                buildingEl.appendChild(nameEl);
            }

            if (state.showDistanceToHG) {
                if (hellGates) {
                    const castleCenterX = building.x + building.size / 2;
                    const castleCenterY = building.y + building.size / 2;
                    const hgCenterX = hellGates.x + hellGates.size / 2;
                    const hgCenterY = hellGates.y + hellGates.size / 2;
                    const distance = Math.sqrt(Math.pow(castleCenterX - hgCenterX, 2) + Math.pow(castleCenterY - hgCenterY, 2));
                    // Только число без единиц измерения
                    nameEl.textContent = distance.toFixed(1);
                } else {
                    nameEl.textContent = translations[state.currentLang]?.hellgatesNotPlaced || "HG not placed";
                }
            } else {
                nameEl.textContent = building.playerName || '';
            }
        }
    });
}

/** Обновляет состояние и видимость панели инструментов для выделенного здания. */
export function updateSelectedBuildingToolbar() {
    const toolbar = document.getElementById('selectedBuildingToolbar');
    const renameBtn = document.getElementById('renameSelectedBuildingBtn');
    const deleteBtn = document.getElementById('deleteSelectedBuildingBtn');

    if (!toolbar || !renameBtn || !deleteBtn) {
        // Эта ошибка может возникать при самой первой инициализации, если DOM еще не полностью готов.
        // console.warn("[uiManager] Элементы панели инструментов для выделенного здания не найдены.");
        return;
    }

    const selectedBuildingObject = state.buildings.find(b => b.id === state.selectedBuilding);

    if (selectedBuildingObject) {
        // Показываем панель с плавной анимацией (через добавление класса)
        toolbar.style.display = 'flex'; // Сначала делаем flex, чтобы размеры рассчитались
        requestAnimationFrame(() => { // Затем добавляем класс для анимации появления
            toolbar.classList.add('visible');
        });

        // Всегда показываем кнопку удаления для выделенного здания
        deleteBtn.style.display = '';
        deleteBtn.disabled = false;

        // Кнопка "Переименовать" должна исчезать полностью, если для данного типа здания
        // переименование не поддерживается (например, не castle и не deadzone).
        const canRename = selectedBuildingObject.type === 'castle' || selectedBuildingObject.type === 'deadzone';
        if (canRename) {
            renameBtn.style.display = '';
            renameBtn.disabled = false;
        } else {
            // Скрываем кнопку вместо того чтобы просто дизейблить её
            renameBtn.style.display = 'none';
            renameBtn.disabled = true;
        }

    } else { // Ничего не выделено
        toolbar.classList.remove('visible');
        // Устанавливаем display:none после завершения CSS transition для правильного скрытия
        // и предотвращения перехвата событий невидимым элементом.
        // CSS transition длится ~0.2s (как указано в styles.css: transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out)
        setTimeout(() => {
            if (!toolbar.classList.contains('visible')) {
                toolbar.style.display = 'none';
            }
        }, 250);

        // Скрываем/деактивируем кнопки когда ничего не выделено
        renameBtn.style.display = 'none';
        renameBtn.disabled = true;
        deleteBtn.style.display = '';
        deleteBtn.disabled = true;
    }
}

/** Обновляет визуальное состояние (текст и класс 'active') для кнопок поворота сетки. */
export function updateRotateButtonVisualState() {
    const ids = ['rotateGridButtonDesktop', 'rotateGridButtonMobile'];
    const currentKey = state.isGridRotated ? 'resetRotation' : 'rotateGrid';
    const text = translations[state.currentLang]?.[currentKey] || currentKey;

    ids.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            // Для кнопок, где текст внутри .text (если это общая кнопка control-btn)
            const textSpan = button.querySelector('.text');
            if (textSpan) {
                textSpan.textContent = text;
            } else {
                button.textContent = text;
            }
            button.classList.toggle('active', state.isGridRotated);
        }
    });
}

/** Обновляет визуальное состояние (класс 'active') для кнопок режима "До Адских Врат". */
export function updateDistanceToHGButtonVisualState() {
    const ids = ['distanceToHGButtonDesktop', 'distanceToHGButtonMobile'];
    ids.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.classList.toggle('active', state.showDistanceToHG);
            // Текст этих кнопок управляется data-key при вызове updateLanguage
        }
    });
}

/** Обновляет отображение среднего расстояния от всех замков до адских врат. */
export function updateAverageDistanceDisplay() {
    const display = document.getElementById('averageDistanceDisplay');
    const valueEl = document.getElementById('averageDistanceValue');
    
    if (!display || !valueEl) return;

    const castles = state.buildings.filter(b => b.type === 'castle');
    const hellGatesArray = state.buildings.filter(b => b.type === 'hellgates');
    const hellGates = hellGatesArray.length > 0 ? hellGatesArray[0] : null;

    // Дисплей всегда видим, но показываем тире если нет данных
    if (castles.length > 0 && hellGates) {
        let totalDistance = 0;
        castles.forEach(castle => {
            const castleCenterX = castle.x + castle.size / 2;
            const castleCenterY = castle.y + castle.size / 2;
            const hgCenterX = hellGates.x + hellGates.size / 2;
            const hgCenterY = hellGates.y + hellGates.size / 2;
            const distance = Math.sqrt(Math.pow(castleCenterX - hgCenterX, 2) + Math.pow(castleCenterY - hgCenterY, 2));
            totalDistance += distance;
        });

        const averageDistance = totalDistance / castles.length;
        valueEl.textContent = `${averageDistance.toFixed(1)} / ${castles.length}`;
    } else {
        // Если нет замков или адских врат, показываем длинное тире
        valueEl.textContent = '—';
    }
}

/** Адаптирует интерфейс под текущий размер экрана. */
export function checkScreenSize() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    document.body.classList.toggle('mobile-view', isMobile);

    // Обновление отображения текста на кнопках панели выделенного здания
    // в зависимости от того, мобильный вид или нет (скрыть/показать .text).
    // Это делается через CSS (.mobile-view .selected-building-toolbar .text { display: none; }),
    // поэтому здесь дополнительных действий не требуется, кроме установки .mobile-view на body.

    // Логика скрытия/показа названий в ДЕСКТОПНОМ тулбаре (если он все еще виден на узких экранах)
    document.querySelectorAll('.toolbar.desktop-only .building-item .building-name').forEach(nameEl => {
        if (isMobile) {
            // На мобильном этот тулбар (.desktop-only) должен быть скрыт через CSS.
            // Эта логика здесь на всякий случай, если CSS не отработает.
            nameEl.style.display = 'none';
        } else {
            nameEl.style.display = ''; // Восстанавливаем отображение
            const key = nameEl.dataset.key;
            if (key && translations[state.currentLang]?.[key]) {
                nameEl.textContent = translations[state.currentLang][key]; // Обновляем текст на случай смены языка
            }
        }
    });
}