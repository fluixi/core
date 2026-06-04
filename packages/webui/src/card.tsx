import { createComponent } from '@fluixi/element';
import { FlxCard, FlxCardBody, FlxCardHeader, FlxCardFooter} from '@fluixi/flx-card';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-card/flx-card.js';


const CardComponent = createComponent({
    tagName: "flx-card",
    elementClass: FlxCard,
    compiler: DOM,
    displayName: "FlxCard",
});
const CardHeader = createComponent({
    tagName: "flx-card-header",
    elementClass: FlxCardHeader,
    compiler: DOM,
    displayName: "FlxCardHeader",
});
const CardBody = createComponent({
    tagName: "flx-card-body",
    elementClass: FlxCardBody,
    compiler: DOM,
    displayName: "FlxCardBody",
});
const CardFooter = createComponent({
    tagName: "flx-card-footer",
    elementClass: FlxCardFooter,
    compiler: DOM,
    displayName: "FlxCardFooter",
});

export const Card = Object.assign(CardComponent, {
    Header: CardHeader,
    Body: CardBody,
    Footer: CardFooter
})

export default Card