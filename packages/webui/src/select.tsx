import { createComponent, EventName } from '@fluixi/element';
import { AdfSelect, AdfSelectMenu, AdfSelectOption, AdfSelectToggler, AdfSelectChangedEvent} from '@awc/adf-select';
import DOM from "@fluixi/dom"
// import '@fluixi/adf-select/adf-select.js';


const SelectComponent = createComponent({
    tagName: "adf-select",
    elementClass: AdfSelect,
    compiler: DOM,
    displayName: "AdfSelect",
    events: {
        onChange: 'onchange' as EventName<AdfSelectChangedEvent>
    }
});

const SelectMenu = createComponent({
    tagName: "adf-select-menu",
    elementClass: AdfSelectMenu,
    compiler: DOM,
    displayName: "AdfSelectMenu",
});
const SelectOption = createComponent({
    tagName: "adf-select-option",
    elementClass: AdfSelectOption,
    compiler: DOM,
    displayName: "AdfSelectOption",
});
const SelectToggler = createComponent({
    tagName: "adf-select-toggler",
    elementClass: AdfSelectToggler,
    compiler: DOM,
    displayName: "AdfSelectToggler",
});

export const Select = Object.assign(SelectComponent, {
    Menu: SelectMenu,
    Toggler: SelectToggler,
    Option: SelectOption,
})

export default Select