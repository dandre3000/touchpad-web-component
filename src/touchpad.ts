import TouchpadHTML from './touchpad.html' with { type: 'text' }

interface ButtonData {
    downX: number
    downY: number
    pressed: boolean
    clicks: number
    clickTimeoutId: number
    doubleClickTimeoutId: number
}

interface ClickData {
    0: ButtonData
    1: ButtonData
    2: ButtonData
    3: ButtonData
    4: ButtonData
}

interface PointerData {
    x: number
    y: number
    movementX: number
    movementY: number
    deadzoneX: number
    deadzoneY: number
    controlX: number
    controlY: number
    analogX: number
    analogY: number
    clickData: ClickData
}

interface TouchpadData {
    touchpad: HTMLTouchpadElement
    /** Shadow element that is the target of setPointerCapture and releasePointerCapture to prevent user tampering.  */
    pointerCaptureTarget: HTMLElement
    clickDistance: number
    clickTime: number
    doubleClickTime: number
    deadzoneRadius: number
    controlRadius: number
    inPointerUp: boolean
    pointerMap: Map<number, PointerData>
}

interface PointerListenerObject extends EventListenerObject {
    touchpadData: TouchpadData
}

const defaultListener = (event: Event) => {
    event.preventDefault()
    event.stopImmediatePropagation()
}

const pointerenterListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    if (event.target !== touchpadData.touchpad || touchpadData.touchpad.hasAttribute('disable')) return

    const { clientX, clientY, pointerId } = event

    touchpadData.pointerMap.set(pointerId, {
        x: clientX,
        y: clientY,
        movementX: 0,
        movementY: 0,
        deadzoneX: clientX,
        deadzoneY: clientY,
        controlX: clientX,
        controlY: clientY,
        analogX: 0,
        analogY: 0,
        clickData: {
            0: { downX: NaN, downY: NaN, pressed: false, clicks: 0, clickTimeoutId: -1, doubleClickTimeoutId: -1 },
            1: { downX: NaN, downY: NaN, pressed: false, clicks: 0, clickTimeoutId: -1, doubleClickTimeoutId: -1 },
            2: { downX: NaN, downY: NaN, pressed: false, clicks: 0, clickTimeoutId: -1, doubleClickTimeoutId: -1 },
            3: { downX: NaN, downY: NaN, pressed: false, clicks: 0, clickTimeoutId: -1, doubleClickTimeoutId: -1 },
            4: { downX: NaN, downY: NaN, pressed: false, clicks: 0, clickTimeoutId: -1, doubleClickTimeoutId: -1 }
        }
    })

    event.preventDefault()
}

const resetClick = (buttonData: ButtonData) => {
    buttonData.downX = NaN
    buttonData.downY = NaN
    buttonData.clickTimeoutId = -1
}

const pointerdownListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    if (touchpadData.touchpad.hasAttribute('disable')) return

    const { button, clientX, clientY, pointerId } = event
    const pointerData = touchpadData.pointerMap.get(pointerId)

    pointerData.x = pointerData.controlX = pointerData.deadzoneX = clientX
    pointerData.y = pointerData.controlY = pointerData.deadzoneY = clientY

    const clickData = pointerData.clickData

    clickData[button].downX = clientX
    clickData[button].downY = clientY
    clickData[button].pressed = true

    clickData[button].clickTimeoutId = setTimeout(resetClick, touchpadData.clickTime, clickData[button])

    touchpadData.pointerCaptureTarget.setPointerCapture(pointerId)
    event.preventDefault()
}

/** Constrain a deadzone center to its control circle. */
const constrainDeadzone = (touchpadData: TouchpadData, pointerData: PointerData) => {
    const controlRadius = touchpadData.controlRadius
    const dx = pointerData.controlX - pointerData.deadzoneX
    const dy = pointerData.controlY - pointerData.deadzoneY
    const distance = Math.hypot(dx, dy)

    if (distance > controlRadius) {
        const scale = (distance - controlRadius) / distance

        pointerData.deadzoneX += dx * scale
        pointerData.deadzoneY += dy * scale
    }
}

const pointermoveListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    if (touchpadData.touchpad.hasAttribute('disable')) return

    const { clientX, clientY, movementX, movementY, pointerId } = event
    const pointerData = touchpadData.pointerMap.get(pointerId)

    pointerData.x = clientX
    pointerData.y = clientY
    pointerData.movementX = movementX
    pointerData.movementY = movementY

    event.preventDefault()

    if (!touchpadData.touchpad.hasAttribute('analog')) return

    const { deadzoneRadius, controlRadius } = touchpadData
    let dx = pointerData.controlX - event.clientX
    let dy = pointerData.controlY - event.clientY
    let distance = Math.hypot(dx, dy)

    if (distance > controlRadius + deadzoneRadius) {
        const scale = (distance - controlRadius - deadzoneRadius) / distance

        pointerData.controlX -= scale * dx
        pointerData.controlY -= scale * dy
    }

    dx = pointerData.deadzoneX - event.clientX
    dy = pointerData.deadzoneY - event.clientY
    distance = Math.hypot(dx, dy)

    if (distance > deadzoneRadius) {
        let scale = (distance - deadzoneRadius) / distance

        pointerData.deadzoneX -= dx * scale
        pointerData.deadzoneY -= dy * scale

        constrainDeadzone(touchpadData, pointerData)
    }

    pointerData.analogX = (pointerData.deadzoneX - pointerData.controlX) / controlRadius
    pointerData.analogY = (pointerData.deadzoneY - pointerData.controlY) / controlRadius
    pointerData.analogX = Math.round(pointerData.analogX * 100) / 100
    pointerData.analogY = Math.round(pointerData.analogY * 100) / 100
}

const resetDoubleClick = (buttonData: ButtonData) => {
    buttonData.clicks = 0
    buttonData.doubleClickTimeoutId = -1
}

const pointerupListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    if (touchpadData.touchpad.hasAttribute('disable')) return

    event.preventDefault()

    if (this.touchpadData.inPointerUp) return

    const { button, pointerId } = event
    const clickData = touchpadData.pointerMap.get(pointerId).clickData

    clickData[button].pressed = false

    if (
        clickData[button].clickTimeoutId !== -1 &&
        Math.hypot(event.clientX - clickData[button].downX, event.clientY - clickData[button].downY) <= this.touchpadData.clickDistance
    ) {
        clearTimeout(clickData[button].clickTimeoutId)
        clickData[button].clickTimeoutId = -1

        event.stopImmediatePropagation()

        touchpadData.inPointerUp = true
        touchpadData.touchpad.dispatchEvent(new PointerEvent('pointerup', event))

        clickData[button].clicks++
        const eventInit = { ...event, detail: clickData[button].clicks }

        touchpadData.touchpad.dispatchEvent(new PointerEvent('click', eventInit))

        if (clickData[button].doubleClickTimeoutId !== -1) {
            clearTimeout(clickData[button].doubleClickTimeoutId)
            clickData[button].doubleClickTimeoutId = -1

            touchpadData.touchpad.dispatchEvent(new PointerEvent('dblclick', eventInit))
        } else {
            clickData[button].doubleClickTimeoutId = setTimeout(resetDoubleClick, touchpadData.doubleClickTime, clickData[button])
        }

        touchpadData.inPointerUp = false
    }

    touchpadData.pointerCaptureTarget.releasePointerCapture(event.pointerId)
}

const clickListener = function (this: PointerListenerObject, event: PointerEvent) {
    if (this.touchpadData.touchpad.hasAttribute('disable')) return

    event.preventDefault()

    if (!this.touchpadData.inPointerUp) event.stopImmediatePropagation()
}

const defaultDeadzoneRadius = 8
const defaultControlRadius = 64
const TouchpadMap = new WeakMap<HTMLTouchpadElement, TouchpadData>

export class HTMLTouchpadElement extends HTMLElement {
    static observedAttributes = ['doubleclicktime', 'deadzoneradius', 'controlradius', 'analogmax']

    constructor () {
        super()

        const touchpadData: TouchpadData = {
            touchpad: this,
            pointerCaptureTarget: null as any,
            clickDistance: 8,
            clickTime: 500,
            doubleClickTime: 500,
            inPointerUp: false,
            deadzoneRadius: defaultDeadzoneRadius,
            controlRadius: defaultControlRadius,
            pointerMap: new Map
        }

        TouchpadMap.set(this, touchpadData)

        const listenerOptions: AddEventListenerOptions = { capture: true, passive: false }

        this.addEventListener('pointerenter', { touchpadData, handleEvent: pointerenterListener } as PointerListenerObject, listenerOptions)
        this.addEventListener('mouseenter', defaultListener, listenerOptions)
        this.addEventListener('mouseover', defaultListener, listenerOptions)
        this.addEventListener('pointerdown', { touchpadData, handleEvent: pointerdownListener } as PointerListenerObject, listenerOptions)
        this.addEventListener('touchstart', defaultListener, listenerOptions)
        this.addEventListener('mousedown', defaultListener, listenerOptions)
        this.addEventListener('pointermove', { touchpadData, handleEvent: pointermoveListener } as PointerListenerObject, listenerOptions)
        this.addEventListener('touchmove', defaultListener, listenerOptions)
        this.addEventListener('mousemove', defaultListener, listenerOptions)
        this.addEventListener('pointerup', { touchpadData, handleEvent: pointerupListener } as PointerListenerObject, listenerOptions)
        this.addEventListener('touchend', defaultListener, listenerOptions)
        this.addEventListener('mouseup', defaultListener, listenerOptions)
        this.addEventListener('click', { touchpadData, handleEvent: clickListener } as PointerListenerObject, listenerOptions)
        this.addEventListener('contextmenu', defaultListener, listenerOptions)
        this.addEventListener('dblclick', { touchpadData, handleEvent: clickListener } as PointerListenerObject, listenerOptions)
        this.addEventListener('mouseout', defaultListener, listenerOptions)
        this.addEventListener('mouseleave', defaultListener, listenerOptions)
    }

    get doubleclicktime () { return TouchpadMap.get(this).doubleClickTime }
    set doubleclicktime (time) {
        this.setAttribute('doubleclicktime', time as any)
    }

    get deadzoneradius () { return TouchpadMap.get(this).deadzoneRadius }
    set deadzoneradius (radius) {
        this.setAttribute('deadzoneradius', radius as any)
    }

    get controlradius () { return TouchpadMap.get(this).controlRadius }
    set controlradius (radius) {
        this.setAttribute('controlradius', radius as any)
    }

    getPointerData (pointerId: number) {
        const pointerData = TouchpadMap.get(this).pointerMap.get(pointerId)

        if (!pointerData) return null

        const pointerDataCopy: any = { ...pointerData }
        const clickData = pointerData.clickData

        pointerDataCopy.clickData = {
            0: { pressed: clickData[0].pressed, clicks: clickData[0].clicks },
            1: { pressed: clickData[1].pressed, clicks: clickData[1].clicks },
            2: { pressed: clickData[2].pressed, clicks: clickData[2].clicks },
            3: { pressed: clickData[3].pressed, clicks: clickData[3].clicks },
            4: { pressed: clickData[4].pressed, clicks: clickData[4].clicks }
        }

        return pointerDataCopy
    }

    attributeChangedCallback (name: string, _: string, newValue: string) {
        switch (name) {
            case 'doubleclicktime': {
                let time = Math.round(Number(newValue))
                if (time < 100)
                    time = 100

                TouchpadMap.get(this).doubleClickTime = time

                break
            }
            case 'deadzoneradius': {
                let radius = Math.round(Number(newValue))
                if (radius < 1)
                    radius = 1

                TouchpadMap.get(this).deadzoneRadius = radius

                break
            }
            case 'controlradius': {
                let radius = Math.round(Number(newValue))
                if (radius < 1)
                    radius = 1

                TouchpadMap.get(this).controlRadius = radius

                break
            }
        }
    }

    connectedCallback () {
        const root = this.attachShadow({ mode: 'closed' })
        root.innerHTML = `${TouchpadHTML}`

        TouchpadMap.get(this).pointerCaptureTarget = root.querySelector('#pointer-capture')
    }
}

customElements.define('touchpad-component', HTMLTouchpadElement)