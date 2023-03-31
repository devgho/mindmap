import EventEmitter from 'eventemitter3'
import { CONSTANTS } from './utils/constant'

//  事件类
class Event extends EventEmitter {
  //  构造函数
  constructor(opt = {}) {
    super()
    this.opt = opt
    this.mindMap = opt.mindMap
    this.isLeftMousedown = false
    this.mousedownPos = {
      x: 0,
      y: 0
    }
    this.mousemovePos = {
      x: 0,
      y: 0
    }
    this.mousemoveOffset = {
      x: 0,
      y: 0
    }
    this.bindFn()
    this.bind()
  }

  //  绑定函数上下文
  bindFn() {
    this.onDrawClick = this.onDrawClick.bind(this)
    this.onDrawMousedown = this.onDrawMousedown.bind(this)
    this.onMousedown = this.onMousedown.bind(this)
    this.onMousemove = this.onMousemove.bind(this)
    this.onMouseup = this.onMouseup.bind(this)
    this.onMousewheel = this.onMousewheel.bind(this)
    this.onContextmenu = this.onContextmenu.bind(this)
    this.onSvgMousedown = this.onSvgMousedown.bind(this)
    this.onKeyup = this.onKeyup.bind(this)
  }

  //  绑定事件
  bind() {
    this.mindMap.svg.on('click', this.onDrawClick)
    this.mindMap.svg.on('mousedown', this.onDrawMousedown)
    this.mindMap.el.addEventListener('mousedown', this.onMousedown)
    this.mindMap.svg.on('mousedown', this.onSvgMousedown)
    window.addEventListener('mousemove', this.onMousemove)
    window.addEventListener('mouseup', this.onMouseup)
    this.mindMap.el.addEventListener('wheel', this.onMousewheel)
    this.mindMap.svg.on('contextmenu', this.onContextmenu)
    window.addEventListener('keyup', this.onKeyup)
  }

  //  解绑事件
  unbind() {
    this.mindMap.svg.off('click', this.onDrawClick)
    this.mindMap.svg.off('mousedown', this.onDrawMousedown)
    this.mindMap.el.removeEventListener('mousedown', this.onMousedown)
    window.removeEventListener('mousemove', this.onMousemove)
    window.removeEventListener('mouseup', this.onMouseup)
    this.mindMap.el.removeEventListener('wheel', this.onMousewheel)
    this.mindMap.svg.off('contextmenu', this.onContextmenu)
    window.removeEventListener('keyup', this.onKeyup)
  }

  //   画布的单击事件
  onDrawClick(e) {
    this.emit('draw_click', e)
  }

  // 画布的鼠标按下事件
  onDrawMousedown(e) {
    this.emit('draw_mousedown', e)
  }

  //   svg画布的鼠标按下事件
  onSvgMousedown(e) {
    this.emit('svg_mousedown', e)
  }

  //  鼠标按下事件
  onMousedown(e) {
    // 鼠标左键
    if (e.which === 1) {
      this.isLeftMousedown = true
    }
    this.mousedownPos.x = e.clientX
    this.mousedownPos.y = e.clientY
    this.emit('mousedown', e, this)
  }

  //  鼠标移动事件
  onMousemove(e) {
    this.mousemovePos.x = e.clientX
    this.mousemovePos.y = e.clientY
    this.mousemoveOffset.x = e.clientX - this.mousedownPos.x
    this.mousemoveOffset.y = e.clientY - this.mousedownPos.y
    this.emit('mousemove', e, this)
    if (this.isLeftMousedown) {
      e.preventDefault()
      this.emit('drag', e, this)
    }
  }

  //  鼠标松开事件
  onMouseup(e) {
    this.isLeftMousedown = false
    this.emit('mouseup', e, this)
  }

  //  鼠标滚动
  onMousewheel(e) {
    e.stopPropagation()
    e.preventDefault()
    let dir
    // 解决mac触控板双指缩放方向相反的问题
    if (e.ctrlKey) {
      if (e.deltaY > 0) dir = CONSTANTS.DIR.UP
      if (e.deltaY < 0) dir = CONSTANTS.DIR.DOWN
      if (e.deltaX > 0) dir = CONSTANTS.DIR.LEFT
      if (e.deltaX < 0) dir = CONSTANTS.DIR.RIGHT
    } else {
      if ((e.wheelDeltaY || e.detail) > 0) dir = CONSTANTS.DIR.UP
      if ((e.wheelDeltaY || e.detail) < 0) dir = CONSTANTS.DIR.DOWN
      if ((e.wheelDeltaX || e.detail) > 0) dir = CONSTANTS.DIR.LEFT
      if ((e.wheelDeltaX || e.detail) < 0) dir = CONSTANTS.DIR.RIGHT
    }
    this.emit('mousewheel', e, dir, this)
  }

  //  鼠标右键菜单事件
  onContextmenu(e) {
    e.preventDefault()
    this.emit('contextmenu', e)
  }

  //  按键松开事件
  onKeyup(e) {
    this.emit('keyup', e)
  }
}

export default Event
