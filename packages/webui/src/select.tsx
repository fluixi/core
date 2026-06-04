import { createComponent, EventName } from '@fluixi/element';
import { FlxSelect, FlxSelectMenu, FlxSelectOption, FlxSelectToggler, FlxSelectChangedEvent} from '@fluixi/flx-select';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-select/flx-select.js';


const SelectComponent = createComponent({
    tagName: "flx-select",
    elementClass: FlxSelect,
    compiler: DOM,
    displayName: "FlxSelect",
    events: {
        onChange: 'onchange' as EventName<FlxSelectChangedEvent>
    }
});

const SelectMenu = createComponent({
    tagName: "flx-select-menu",
    elementClass: FlxSelectMenu,
    compiler: DOM,
    displayName: "FlxSelectMenu",
});
const SelectOption = createComponent({
    tagName: "flx-select-option",
    elementClass: FlxSelectOption,
    compiler: DOM,
    displayName: "FlxSelectOption",
});
const SelectToggler = createComponent({
    tagName: "flx-select-toggler",
    elementClass: FlxSelectToggler,
    compiler: DOM,
    displayName: "FlxSelectToggler",
});

export const Select = Object.assign(SelectComponent, {
    Menu: SelectMenu,
    Toggler: SelectToggler,
    Option: SelectOption,
})

export default Select