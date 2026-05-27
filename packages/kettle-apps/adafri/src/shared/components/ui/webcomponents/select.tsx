import { createJsxComponent as createComponent, EventName } from '@awc/kettlejs';
import { AdfSelect, AdfSelectMenu, AdfSelectOption, AdfSelectChangedEvent} from '@awc/adf-select';
import DOM from "@awc/dom"
// import '@awc/adf-select/adf-select.js';


const SelectComponent = createComponent({
    tagName: "adf-select",
    elementClass: AdfSelect,
    compiler: DOM,
    displayName: "AdfSelect",
    events: {
        onChange: 'change' as EventName<AdfSelectChangedEvent>
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

export const Select = Object.assign(SelectComponent, {
    Menu: SelectMenu,
    Option: SelectOption,
})

export default Select