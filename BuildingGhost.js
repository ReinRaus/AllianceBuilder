// BuildingGhost.js
// Компонент для отображения "призрака" здания на сетке.
// Этот призрак появляется во время операции перетаскивания нового здания
// с панели инструментов (десктоп) или при выборе инструмента и перемещении
// пальца/мыши над сеткой (мобильный режим).

function BuildingGhost() {
    // Получаем данные о текущем призраке и размер ячейки из глобального состояния
    const { ghostBuilding, cellSize } = React.useContext(AppStateContext);

    // Если в состоянии нет данных о призраке (ghostBuilding === null),
    // то ничего не рендерим.
    if (!ghostBuilding) {
        return null;
    }

    // Получаем статическую конфигурацию для типа здания, представленного призраком
    const config = window.appBuildingConfig[ghostBuilding.type];
    if (!config) {
        // Если конфигурация не найдена (например, из-за ошибки в типе),
        // выводим предупреждение в консоль и не рендерим призрак.
        console.warn(`[BuildingGhost] Не найдена конфигурация для типа призрака: ${ghostBuilding.type}`);
        return null;
    }

    // Извлекаем данные призрака из состояния:
    // x, y - координаты левого верхнего угла призрака на сетке (в ячейках)
    // size - размер призрака (N x N ячеек, берется из config.size здания)
    // areaSize - размер области влияния призрака (если есть, из config.areaSize)
    // isInvalidPosition - флаг, указывающий, находится ли призрак в недопустимой позиции (например, из-за наложения)
    const { x, y, size, areaSize, isInvalidPosition } = ghostBuilding;

    // Рассчитываем стили для позиционирования и размеров основного элемента призрака
    const ghostStyle = {
        left: x * cellSize + 'px',
        top: y * cellSize + 'px',
        width: size * cellSize + 'px',
        height: size * cellSize + 'px',
    };

    // Рассчитываем стили для области влияния призрака, если она должна отображаться
    let areaGhostStyle = null;
    if (areaSize > 0) {
        // Смещение для центрирования области влияния относительно призрака здания
        const offset = Math.floor((areaSize - size) / 2);
        areaGhostStyle = {
            left: (x - offset) * cellSize + 'px',
            top: (y - offset) * cellSize + 'px',
            width: areaSize * cellSize + 'px',
            height: areaSize * cellSize + 'px',
        };
    }

    // Формируем классы для основного элемента призрака
    // Базовый класс 'building-ghost' и дополнительный 'invalid-position', если позиция некорректна.
    let ghostClasses = "building-ghost";
    if (isInvalidPosition) {
        ghostClasses += " invalid-position";
    }

    return (
        // Используем React.Fragment, так как у нас может быть два корневых элемента
        // (призрак здания и призрак его области влияния), если область влияния есть.
        <React.Fragment>
            {/* Рендерим призрак области влияния только если areaGhostStyle был рассчитан */}
            {areaGhostStyle && <div className="ghost-area" style={areaGhostStyle}></div>}
            
            {/* Основной элемент призрака здания */}
            <div className={ghostClasses} style={ghostStyle}>
                {/* Внутри призрака отображаем иконку соответствующего здания */}
                <span className="icon">{config.icon}</span>
            </div>
        </React.Fragment>
    );
}