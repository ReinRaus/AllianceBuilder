/**
 * Объект с переводами интерфейса на разные языки.
 * Ключи верхнего уровня - коды языков (ru, en, pt_br, de).
 * Внутренние ключи соответствуют элементам интерфейса или строкам текста.
 */
export const translations = {
    ru: {
        title: "Планировщик зданий альянса",
        buildingsHeader: "Здания", // Заголовок панели выбора зданий
        buildingsListHeader: "Список зданий", // Заголовок списка размещенных зданий
        modalTitle: "Имя игрока", // Заголовок модального окна при создании замка
        renameModalTitle: "Переименовать замок", // Заголовок модального окна при переименовании
        gridSizeLabel: "Размер сетки:",
        apply: "Применить",
        save: "Сохранить", // Общий текст для кнопок сохранения в модалках
        fortress: "Крепость альянса",
        outpost: "Форпост альянса",
        hellgates: "Адские врата",
        hospital: "Госпиталь",
        farm: "Ферма",
        warehouse: "Склад",
        castle: "Замок игрока",
        deadzone: "Мертвая зона",
        rename: "Переименовать", // Текст для кнопки переименования в списке
        delete: "Удалить", // Текст для кнопки удаления в списке
        playerName: "Имя игрока", // Плейсхолдер для инпута имени
        shareLink: "Поделиться ссылкой", // Текст для кнопки "Сохранить/Поделиться состоянием" в шапке
        rotateGrid: "Повернуть сетку",
        resetRotation: "Сбросить поворот",
        distanceToHGLabel: "До Адских Врат",
        distanceUnit: "", // Единица измерения "клетки" для русского языка
        hellgatesNotPlaced: "Врата не установлены",
        cannotShiftFurther: "Невозможно сдвинуть здания дальше."
    },
    en: {
        title: "Alliance Buildings Planner",
        buildingsHeader: "Buildings",
        buildingsListHeader: "Buildings List",
        modalTitle: "Player Name",
        renameModalTitle: "Rename Castle",
        gridSizeLabel: "Grid Size:",
        apply: "Apply",
        save: "Save",
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
        shareLink: "Share Link",
        rotateGrid: "Rotate Grid",
        resetRotation: "Reset Rotation",
        distanceToHGLabel: "To Hell Gates",
        distanceUnit: "cells",
        hellgatesNotPlaced: "Gates not placed",
        cannotShiftFurther: "Cannot shift buildings further."
    },
    pt_br: {
        title: "Planejador de Construções da Aliança",
        buildingsHeader: "Construções",
        buildingsListHeader: "Lista de Construções",
        modalTitle: "Nome do Jogador",
        renameModalTitle: "Renomear Castelo",
        gridSizeLabel: "Tamanho da Grade:",
        apply: "Aplicar",
        save: "Salvar",
        fortress: "Fortaleza da Aliança",
        outpost: "Posto Avançado da Aliança",
        hellgates: "Portões Infernais",
        hospital: "Hospital",
        farm: "Fazenda",
        warehouse: "Armazém",
        castle: "Castelo do Jogador",
        deadzone: "Zona Morta",
        rename: "Renomear",
        delete: "Excluir",
        playerName: "Nome do Jogador",
        shareLink: "Compartilhar Link",
        defaultCastleNamePrefix: "Castelo ", // POTENTIAL_ISSUE: Не используется, но оставлен для примера
        rotateGrid: "Girar Grade",
        resetRotation: "Resetar Rotação",
        distanceToHGLabel: "Aos Portões Infernais",
        distanceUnit: "células",
        hellgatesNotPlaced: "Portões não colocados",
        cannotShiftFurther: "Não é possível mover mais as construções."
    },
    de: {
        title: "Allianz Gebäudeplaner",
        buildingsHeader: "Gebäude",
        buildingsListHeader: "Gebäudeliste",
        modalTitle: "Spielername",
        renameModalTitle: "Burg umbenennen",
        gridSizeLabel: "Rastergröße:",
        apply: "Anwenden",
        save: "Speichern",
        fortress: "Allianzfestung",
        outpost: "Außenposten der Allianz",
        hellgates: "Höllentore",
        hospital: "Krankenhaus",
        farm: "Farm",
        warehouse: "Lagerhaus",
        castle: "Spielerburg",
        deadzone: "Todeszone",
        rename: "Umbenennen",
        delete: "Löschen",
        playerName: "Spielername",
        shareLink: "Link teilen",
        rotateGrid: "Raster drehen",
        resetRotation: "Drehung zurücksetzen",
        distanceToHGLabel: "Zu den Höllentoren",
        distanceUnit: "Felder",
        hellgatesNotPlaced: "Tore nicht platziert",
        cannotShiftFurther: "Gebäude können nicht weiter verschoben werden."
    }
};

/**
 * Конфигурация зданий.
 * Определяет их свойства: иконку, размер на сетке, размер области влияния (если есть),
 * лимит на количество, тип (альянсовое, игрока, специальное) и цвет фона для особых типов.
 */
export const buildingConfig = {
    fortress: { icon: '🏰', size: 3, areaSize: 15, limit: 1, type: 'alliance' },
    outpost: { icon: '🚩', size: 2, areaSize: 10, limit: 5, type: 'alliance' },
    hellgates: { icon: '👹', size: 3, areaSize: 0, limit: 1, type: 'alliance' },
    hospital: { icon: '🏥', size: 2, areaSize: 0, limit: 1, type: 'alliance' },
    farm: { icon: '🌾', size: 2, areaSize: 0, limit: 1, type: 'alliance' },
    warehouse: { icon: '🏭', size: 2, areaSize: 0, limit: 1, type: 'alliance' },
    castle: { icon: '🏯', size: 2, areaSize: 0, limit: -1, type: 'player' }, // limit -1 означает безлимитное количество
    deadzone: { icon: '⚠️', size: 1, areaSize: 0, limit: -1, type: 'special', bgcolor: 'rgba(144, 238, 144, 0.5)' },
};