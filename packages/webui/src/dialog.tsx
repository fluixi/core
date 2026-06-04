import { createComponent, withPortal, withSubComponents, EventName } from '@fluixi/element';
import { FlxDialog, FlxDialogBody, FlxDialogContent, FlxDialogHeader, FlxDialogFooter, FlxDialogToggleEvent} from '@fluixi/flx-dialog';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-dialog/flx-dialog.js';


const DialogBase = createComponent({
    tagName: "flx-dialog",
    elementClass: FlxDialog,
    compiler: DOM,
    displayName: "FlxDialog",
    events: {
        onToggle: 'ontoggle' as EventName<FlxDialogToggleEvent>
    }
});

const DialogHeader = createComponent({
    tagName: "flx-dialog-header",
    elementClass: FlxDialogHeader,
    compiler: DOM,
    displayName: "FlxDialogHeader",
});
const DialogContent = createComponent({
    tagName: "flx-dialog-content",
    elementClass: FlxDialogContent,
    compiler: DOM,
    displayName: "FlxDialogContent",
});
const DialogBody = createComponent({
    tagName: "flx-dialog-body",
    elementClass: FlxDialogBody,
    compiler: DOM,
    displayName: "FlxDialogBody",
});
const DialogFooter = createComponent({
    tagName: "flx-dialog-footer",
    elementClass: FlxDialogFooter,
    compiler: DOM,
    displayName: "FlxDialogFooter",
});

export const Dialog = withSubComponents(withPortal(DialogBase), {
    Header: DialogHeader,
    Body: DialogBody,
    Content: DialogContent,
    Footer: DialogFooter,
});

export default Dialog
