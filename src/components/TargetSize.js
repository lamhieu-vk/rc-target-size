/* @flow */

import React, { PureComponent, isValidElement, cloneElement } from 'react'
import { findDOMNode } from 'react-dom'
import ResizeObserver from 'resize-observer-polyfill'
import debounce from 'lodash.debounce'
import throttle from 'lodash.throttle'
import TargetReference from 'components/TargetReference'
import {
  handleWarning, handleError, compare, isFunction,
} from 'lib/util'
import { DEFAULT_CONFIG, DEFAULT_VALUES } from 'lib/enums'

const refreshMode = { debounce, throttle }

class TargetSize extends PureComponent<TProps, TState> {
  target: any = null // eslint-disable-line react/sort-comp

  element: any = null // eslint-disable-line react/sort-comp

  constructor(props: TProps) {
    super(props)

    const {
      mode = DEFAULT_CONFIG.mode,
      rate = DEFAULT_CONFIG.rate,
    } = props || {}

    this.state = {
      canUseDOM: DEFAULT_VALUES.canUseDOM,
      width: DEFAULT_VALUES.width,
      height: DEFAULT_VALUES.height,
      offset: DEFAULT_VALUES.offset,
    }

    const refreshHandler = refreshMode && refreshMode[mode]
    if (!isFunction(refreshHandler)) handleWarning('Mode is not support')

    const resizeObserver = (isFunction(refreshHandler)
        && refreshHandler(this.createResizeObserver, rate))
      || this.createResizeObserver
    this.target = new ResizeObserver(resizeObserver)
  }

  componentDidMount() {
    this.toggleObserve(true)
  }

  componentWillUnmount() {
    this.toggleObserve(false)
  }

  toggleObserve = (isConnect: boolean): boolean => {
    const [isAvailable, element] = this.canUseElement()
    if (!isAvailable || !element) return false

    const type = isConnect ? 'observe' : 'unobserve'
    this.target[type](element)

    return true
  }

  canUseElement = (): [boolean, any] => {
    const resizableElement = this.getResizableElement()
    if (!this.target) {
      handleError('Not found target element')
      return [false, null]
    }

    if (!resizableElement) {
      handleError('Not found resizable element')
      return [false, null]
    }

    return [true, resizableElement]
  }

  getResizableElement = (): any => {
    const { querySelector } = this.props
    return querySelector
      ? document.querySelector(querySelector)
      : findDOMNode(this.element) // eslint-disable-line react/no-find-dom-node
  }

  getChildProps = (): TChildProps => {
    const {
      canUseDOM, width, height, offset,
    } = this.state
    const { mapStateToProps } = this.props

    const appendProps = isFunction(mapStateToProps)
      ? mapStateToProps(this.state)
      : {}

    return {
      canUseDOM,
      width,
      height,
      offset,
      ...appendProps,
    }
  }

  createResizeObserver = (entries: any): any => {
    const {
      canUseDOM,
      width: prevWidth,
      height: prevHeight,
      offset: prevOffset,
    } = this.state

    const {
      handleWidth = DEFAULT_CONFIG.handleWidth,
      handleHeight = DEFAULT_CONFIG.handleHeight,
      handleOffset = DEFAULT_CONFIG.handleOffset,
      updateOnChange = DEFAULT_CONFIG.updateOnChange,
    } = this.props

    if (canUseDOM && !updateOnChange) return this.toggleObserve(false)

    const element = this.getResizableElement()
    const entry = entries && entries[0]
    if (!element || !entry) return null

    const { width: nextWidth, height: nextHeight } = entry.contentRect

    const nextOffset = {
      y: element.offsetTop,
      x: element.offsetLeft,
    }

    const handleAll = !handleWidth && !handleHeight && !handleOffset

    const isChangedWidth = !compare(prevWidth, nextWidth)
    const isChangedHeight = !compare(prevHeight, nextHeight)
    const isChangedOffset = !compare(prevOffset.y, nextOffset.y)
      || !compare(prevOffset.x, nextOffset.x)

    const shouldUpdateWidth = (handleAll || handleWidth) && isChangedWidth
    const shouldUpdateHeight = (handleAll || handleHeight) && isChangedHeight
    const shouldUpdateOffset = (handleAll || handleOffset) && isChangedOffset

    if (shouldUpdateWidth || shouldUpdateHeight || shouldUpdateOffset) {
      this.setState({
        canUseDOM: true,
        width: nextWidth,
        height: nextHeight,
        offset: nextOffset,
      })
      this.onSize()
    }

    return true
  }

  createRef = (el: any) => {
    this.element = el
  }

  onSize = () => {
    const { ...rest } = this.state
    const { onSize } = this.props

    if (onSize && !isFunction(onSize)) handleWarning('onSize is not function')
    if (isFunction(onSize)) onSize({ ...rest })
  }

  render() {
    const { children } = this.props

    const isFunctional = isFunction(children)
    const isComponent = isValidElement(children)

    if (!isFunctional && !isComponent) return children

    const childProps = this.getChildProps()
    const component = isFunctional
      ? cloneElement(children(childProps))
      : cloneElement(children, childProps)

    return <TargetReference ref={this.createRef}>{component}</TargetReference>
  }
}

export default TargetSize
