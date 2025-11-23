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

        deleteBtn.disabled = false;

        const canRename = selectedBuildingObject.type === 'castle' || selectedBuildingObject.type === 'deadzone';
        renameBtn.disabled = !canRename;

    } else { // Ничего не выделено
        toolbar.classList.remove('visible');
        // Можно добавить setTimeout перед установкой display:none, чтобы анимация успела отработать
        // Но лучше управлять этим через CSS transition на opacity и pointer-events.
        // Если display:none устанавливается сразу, transition на transform/opacity не сработает.
        // Поэтому в CSS .selected-building-toolbar по умолчанию opacity:0, transform: translateY(10px), pointer-events: none
        // А .visible делает opacity:1, transform: translateY(0), pointer-events: auto
        // display:flex/none лучше использовать для полного скрытия/показа, если анимация не нужна при этом.
        // Пока оставим как есть, CSS уже настроен на opacity/transform.
        // display: none можно установить после завершения transition, если это важно для производительности.
        // Для простоты, если невидима, то можно и display:none.
        // toolbar.style.display = 'none'; // Скрываем панель (может прервать анимацию скрытия)

        renameBtn.disabled = true;
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