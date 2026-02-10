import TouchpadHTML from './touchpad.html' with { type: 'text' }

interface AnalogData {
    pointerId: number
    deadzoneX: number
    deadzoneY: number
    controlX: number
    controlY: number
    analogX: number
    analogY: number
}

interface TouchpadData {
    touchpad: HTMLTouchpadElement
    /** Shadow element that is the target of setPointerCapture and releasePointerCapture to prevent user tampering.  */
    pointerCaptureTarget: HTMLElement
    isClicking: boolean
    clickCount: number
    doubleClickTime: number
    doubleClickTimeoutId
    deadzoneRadius: number
    controlRadius: number
    analogMax: number
    analogMap: Map<number, AnalogData>
}

interface PointerListenerObject extends EventListenerObject {
    touchpadData: TouchpadData
}

const stopImmediatePropagation = (event: Event) => event.stopImmediatePropagation()

/** Constrain a deadzone center to its control circle. */
const constrainDeadzone = (touchpadData: TouchpadData, analogData: AnalogData) => {
    const controlRadius = touchpadData.controlRadius
    const dx = analogData.controlX - analogData.deadzoneX
    const dy = analogData.controlY - analogData.deadzoneY
    const distance = Math.hypot(dx, dy)

    if (distance > controlRadius) {
        const scale = (distance - controlRadius) / distance

        analogData.deadzoneX += dx * scale
        analogData.deadzoneY += dy * scale
    }
}

const pointerdownListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    touchpadData.pointerCaptureTarget.setPointerCapture(event.pointerId)

    if (touchpadData.analogMap.size < touchpadData.analogMax) {
        const { x, y } = touchpadData.touchpad.getBoundingClientRect()
        const analogData = {
            pointerId: event.pointerId,
            deadzoneX: event.clientX - x,
            deadzoneY: event.clientY - y,
            controlX: event.clientX - x,
            controlY: event.clientY - y,
            analogX: 0,
            analogY: 0
        }

        touchpadData.analogMap.set(event.pointerId, analogData)

        constrainDeadzone(touchpadData, analogData)
    }

    event.preventDefault()
}

const pointermoveListener = function (this: PointerListenerObject, event: PointerEvent) {
    const touchpadData = this.touchpadData

    if (touchpadData.analogMap.size === 0) return

    const analogData = touchpadData.analogMap.get(event.pointerId)

    if (!analogData) return

    const { x, y } = touchpadData.touchpad.getBoundingClientRect()
    const { deadzoneRadius, controlRadius } = touchpadData
    let dx = analogData.controlX - event.clientX + x
    let dy = analogData.controlY - event.clientY + y
    let distance = Math.hypot(dx, dy)

    if (distance > controlRadius + deadzoneRadius) {
        const scale = (distance - controlRadius - deadzoneRadius) / distance

        analogData.controlX -= scale * dx
        analogData.controlY -= scale * dy
    }

    dx = analogData.deadzoneX - event.clientX + x
    dy = analogData.deadzoneY - event.clientY + y
    distance = Math.hypot(dx, dy)

    if (distance > deadzoneRadius) {
        let scale = (distance - deadzoneRadius) / distance

        analogData.deadzoneX -= dx * scale
        analogData.deadzoneY -= dy * scale

        constrainDeadzone(touchpadData, analogData)
    }

    analogData.analogX = (analogData.deadzoneX - analogData.controlX) / controlRadius
    analogData.analogY = (analogData.deadzoneY - analogData.controlY) / controlRadius
    analogData.analogX = Math.round(analogData.analogX * 100) / 100
    analogData.analogY = Math.round(analogData.analogY * 100) / 100

    event.preventDefault()
}

const pointerupListener = function (this: PointerListenerObject, event: PointerEvent) {
    this.touchpadData.pointerCaptureTarget.releasePointerCapture(event.pointerId)
    this.touchpadData.analogMap.delete(event.pointerId)
}

const clickListener = function (this: PointerListenerObject, event: PointerEvent) {
    if (!this.touchpadData.isClicking) {
        this.touchpadData.isClicking = true
        this.touchpadData.clickCount++

        clearTimeout(this.touchpadData.doubleClickTimeoutId)
        this.touchpadData.doubleClickTimeoutId = setTimeout(() => {
            this.touchpadData.clickCount = 0
        }, this.touchpadData.doubleClickTime)

        const {
            pointerId,
            pointerType,
            button,
            buttons,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        } = event

        this.touchpadData.touchpad.dispatchEvent(new PointerEvent('click', {
            bubbles: true,
            pointerId,
            pointerType,
            button,
            buttons,
            detail: this.touchpadData.clickCount,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))

        if ((this.touchpadData.clickCount ^ 1) === this.touchpadData.clickCount + 1) this.touchpadData.touchpad.dispatchEvent(new PointerEvent('dblclick', {
            bubbles: true,
            pointerId,
            pointerType,
            button,
            buttons,
            detail: this.touchpadData.clickCount,
            screenX,
            screenY,
            clientX,
            clientY,
            width,
            height
        }))

        this.touchpadData.isClicking = false

        event.stopImmediatePropagation()
    }
}

const dblclickListener = function (this: PointerListenerObject, event: PointerEvent) {
    if (!this.touchpadData.isClicking) event.stopImmediatePropagation()
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
            isClicking: false,
            clickCount: 0,
            doubleClickTime: 500,
            doubleClickTimeoutId: NaN,
            deadzoneRadius: defaultDeadzoneRadius,
            controlRadius: defaultControlRadius,
            analogMax: 0,
            analogMap: new Map
        }

        TouchpadMap.set(this, touchpadData)

        this.addEventListener('pointerdown', { touchpadData, handleEvent: pointerdownListener } as PointerListenerObject, true)
        this.addEventListener('touchstart', stopImmediatePropagation)
        this.addEventListener('mousedown', stopImmediatePropagation)
        this.addEventListener('pointermove', { touchpadData, handleEvent: pointermoveListener } as PointerListenerObject, true)
        this.addEventListener('touchmove', stopImmediatePropagation)
        this.addEventListener('mousemove', stopImmediatePropagation)
        this.addEventListener('pointerup', { touchpadData, handleEvent: pointerupListener } as PointerListenerObject, true)
        this.addEventListener('touchend', stopImmediatePropagation)
        this.addEventListener('mouseup', stopImmediatePropagation)
        this.addEventListener('click', { touchpadData, handleEvent: clickListener } as PointerListenerObject, true)
        this.addEventListener('dblclick', { touchpadData, handleEvent: dblclickListener } as PointerListenerObject, true)
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

    get analogmax () { return TouchpadMap.get(this).analogMax }
    set analogmax (max) {
        this.setAttribute('analogmax', max as any)
    }

    getAnalogData (pointerId: number) { return TouchpadMap.get(this).analogMap.get(pointerId) || null }

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
            case 'analogmax': {
                const touchpadData = TouchpadMap.get(this)
                const pointerIds = touchpadData.analogMap.keys()

                touchpadData.analogMax = Number(newValue)

                if (touchpadData.analogMax < 1) {
                    touchpadData.analogMap.clear()
                    return
                }

                let i = 0

                for (const id of pointerIds) {
                    if (i > touchpadData.analogMax) touchpadData.analogMap.delete(id)
                    i++
                }

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