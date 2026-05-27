import { createComponent, EventName } from '@awc/element';
import { AdfDraggable, AdfDraggableItem, AdfDraggableReorderEvent} from '@awc/adf-draggable';
import DOM from "@awc/dom"
// import '@awc/adf-draggable/adf-draggable.js';


const DraggableComponent = createComponent({
    tagName: "adf-draggable",
    elementClass: AdfDraggable,
    compiler: DOM,
    displayName: "AdfDraggable",
    events: {
        onReorder: 'reorder' as EventName<AdfDraggableReorderEvent>
    }
});

export const DraggableItem = createComponent({
    tagName: "adf-drag-item",
    elementClass: AdfDraggableItem,
    compiler: DOM,
    displayName: "AdfDraggableItem"
});


export const Draggable = Object.assign(DraggableComponent, {
    Item: DraggableItem,
})

export default Draggable
