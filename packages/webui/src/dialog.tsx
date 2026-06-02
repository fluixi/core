import { createComponent, withPortal, withSubComponents, EventName } from '@fluixi/element';
import { AdfDialog, AdfDialogBody, AdfDialogContent, AdfDialogHeader, AdfDialogFooter, AdfDialogToggleEvent} from '@awc/adf-dialog';
import DOM from "@fluixi/dom"
// import '@fluixi/adf-dialog/adf-dialog.js';


const DialogBase = createComponent({
    tagName: "adf-dialog",
    elementClass: AdfDialog,
    compiler: DOM,
    displayName: "AdfDialog",
    events: {
        onToggle: 'ontoggle' as EventName<AdfDialogToggleEvent>
    }
});

const DialogHeader = createComponent({
    tagName: "adf-dialog-header",
    elementClass: AdfDialogHeader,
    compiler: DOM,
    displayName: "AdfDialogHeader",
});
const DialogContent = createComponent({
    tagName: "adf-dialog-content",
    elementClass: AdfDialogContent,
    compiler: DOM,
    displayName: "AdfDialogContent",
});
const DialogBody = createComponent({
    tagName: "adf-dialog-body",
    elementClass: AdfDialogBody,
    compiler: DOM,
    displayName: "AdfDialogBody",
});
const DialogFooter = createComponent({
    tagName: "adf-dialog-footer",
    elementClass: AdfDialogFooter,
    compiler: DOM,
    displayName: "AdfDialogFooter",
});

export const Dialog = withSubComponents(withPortal(DialogBase), {
    Header: DialogHeader,
    Body: DialogBody,
    Content: DialogContent,
    Footer: DialogFooter,
});

export default Dialog
