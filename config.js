// Локализация
export const translations = {
    ru: {
        title: "Планировщик зданий альянса",
        buildingsHeader: "Здания ⇆",
        buildingsListHeader: "Список зданий",
        modalTitle: "Имя игрока",
        renameModalTitle: "Переименовать замок",
        gridSizeLabel: "Размер сетки:",
        apply: "Применить",
        save: "Сохранить", // Общая кнопка "Сохранить"
        fortress: "Крепость альянса",
        outpost: "Форпост альянса",
        hellgates: "Адские врата",
        hospital: "Госпиталь",
        farm: "Ферма",
        warehouse: "Склад",
        castle: "Замок игрока",
        deadzone: "Мертвая зона",
        rename: "Переименовать",
        delete: "Удалить",
        playerName: "Имя игрока",
        saveButton: "Сохранить" // Кнопка для шаринга состояния
    },
    en: {
        title: "Alliance Buildings Planner",
        buildingsHeader: "Buildings ⇆",
        buildingsListHeader: "Buildings List",
        modalTitle: "Player Name",
        renameModalTitle: "Rename Castle",
        gridSizeLabel: "Grid Size:",
        apply: "Apply",
        save: "Save", // General save button
        fortress: "Alliance Fortress",
        outpost: "Alliance Outpost",
        hellgates: "Hell Gates",
        hospital: "Hospital",
        farm: "Farm",
        warehouse: "Warehouse",
        castle: "Player Castle",
        deadzone: "Dead Zone",
        rename: "Rename",
        delete: "Delete",
        playerName: "Player Name",
        saveButton: "Save", // Button for sharing state
    }
};

// Конфигурация зданий
export const buildingConfig = {
    fortress: { icon: '🏰', size: 3, areaSize: 15, limit: 1, type: 'alliance' },
    outpost: { icon: '🚩', size: 2, areaSize: 10, limit: 5, type: 'alliance' },
    hellgates: { icon: '👹', size: 3, areaSize: 0, limit: 1, type: 'alliance' },
    hospital: { icon: '🏥', size: 2, areaSize: 0, limit: 1, type: 'alliance' },
    farm: { icon: '🌾', size: 2, areaSize: 0, limit: 1, type: 'alliance' },
    warehouse: { icon: '🏭', size: 2, areaSize: 0, limit: 1, type: 'alliance' },
    castle: { icon: '🏯', size: 2, areaSize: 0, limit: -1, type: 'player' },
    deadzone: { icon: '⚠️', size: 1, areaSize: 0, limit: -1, type: 'special', bgcolor: 'rgba(144, 238, 144, 0.5)' },
};