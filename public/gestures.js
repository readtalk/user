// === WHATSAPP ADVANCED GESTURE SYSTEM ===
class WhatsAppGestures {
    constructor() {
        this.gestureState = {
            isSwiping: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            velocityX: 0,
            velocityY: 0,
            lastTimestamp: 0,
            activeElement: null,
            gestureType: null,
            threshold: 50,
            maxSwipeDistance: 160,
            longPressTimeout: null,
            doubleTapTimeout: null,
            lastTapTime: 0,
            lastTapPosition: { x: 0, y: 0 }
        };
        
        this.config = {
            swipeThreshold: 50,
            longPressDuration: 500,
            doubleTapMaxDelay: 300,
            doubleTapMaxDistance: 20,
            inertiaDeceleration: 0.92,
            minVelocityForInertia: 0.5,
            overscrollDamping: 0.3,
            elasticBoundary: 100
        };
        
        this.callbacks = {
            onSwipeLeft: null,
            onSwipeRight: null,
            onSwipeUp: null,
            onSwipeDown: null,
            onLongPress: null,
            onDoubleTap: null,
            onPinchStart: null,
            onPinchChange: null,
            onPinchEnd: null,
            onPullToRefresh: null,
            onEdgeSwipe: null
        };
        
        this.init();
    }
    
    init() {
        console.log('👆 WhatsApp Gestures initializing...');
        
        this.setupEventListeners();
        this.setupGestureRecognizers();
        this.setupPullToRefresh();
        this.setupEdgeGestures();
        
        console.log('✅ WhatsApp Gestures ready');
    }
    
    setupEventListeners() {
        // Prevent default touch behaviors
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.handleTouchStart(e);
            } else if (e.touches.length === 2) {
                this.handlePinchStart(e);
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                this.handleTouchMove(e);
            } else if (e.touches.length === 2) {
                this.handlePinchMove(e);
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                this.handleTouchEnd(e);
            } else if (e.touches.length === 1) {
                // Transition from pinch to single touch
                this.gestureState.gestureType = null;
            }
        }, { passive: true });
        
        document.addEventListener('touchcancel', (e) => {
            this.handleTouchEnd(e);
        }, { passive: true });
        
        // Mouse events for desktop testing
        document.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        document.addEventListener('mouseup', (e) => {
            this.handleMouseUp(e);
        });
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            if (this.gestureState.gestureType === 'long-press') {
                e.preventDefault();
            }
        });
        
        // Handle keyboard gestures
        document.addEventListener('keydown', (e) => {
            this.handleKeyGesture(e);
        });
    }
    
    setupGestureRecognizers() {
        // Setup Hammer.js style recognizers
        this.recognizers = {
            swipe: {
                enabled: true,
                direction: 'horizontal',
                threshold: this.config.swipeThreshold,
                velocity: 0.3
            },
            longPress: {
                enabled: true,
                time: this.config.longPressDuration
            },
            doubleTap: {
                enabled: true,
                time: this.config.doubleTapMaxDelay,
                distance: this.config.doubleTapMaxDistance
            },
            pinch: {
                enabled: true,
                threshold: 0.1
            }
        };
    }
    
    setupPullToRefresh() {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;
        
        let pullStartY = 0;
        let pullDistance = 0;
        let isPulling = false;
        
        mainContent.addEventListener('touchstart', (e) => {
            if (mainContent.scrollTop === 0 && e.touches.length === 1) {
                pullStartY = e.touches[0].clientY;
                isPulling = true;
            }
        }, { passive: true });
        
        mainContent.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            const currentY = e.touches[0].clientY;
            pullDistance = currentY - pullStartY;
            
            if (pullDistance > 0) {
                e.preventDefault();
                this.showPullToRefresh(pullDistance);
            }
        }, { passive: false });
        
        mainContent.addEventListener('touchend', () => {
            if (isPulling && pullDistance > 100) {
                this.triggerPullToRefresh();
            }
            this.hidePullToRefresh();
            isPulling = false;
            pullDistance = 0;
        }, { passive: true });
    }
    
    setupEdgeGestures() {
        // Edge swipe for navigation (like iOS back gesture)
        const edgeZoneWidth = 30;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches[0].clientX < edgeZoneWidth) {
                this.gestureState.edgeGesture = 'left-edge';
            } else if (e.touches[0].clientX > window.innerWidth - edgeZoneWidth) {
                this.gestureState.edgeGesture = 'right-edge';
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (this.gestureState.edgeGesture === 'left-edge' && e.touches[0].clientX > 50) {
                this.showEdgeSwipeBack(e.touches[0].clientX);
            }
        }, { passive: false });
    }
    
    handleTouchStart(event) {
        const touch = event.touches[0];
        
        this.gestureState.startX = touch.clientX;
        this.gestureState.startY = touch.clientY;
        this.gestureState.currentX = touch.clientX;
        this.gestureState.currentY = touch.clientY;
        this.gestureState.lastTimestamp = event.timeStamp;
        this.gestureState.isSwiping = false;
        this.gestureState.activeElement = this.getElementFromPoint(touch.clientX, touch.clientY);
        
        // Check for long press
        this.gestureState.longPressTimeout = setTimeout(() => {
            this.triggerLongPress(touch.clientX, touch.clientY);
        }, this.config.longPressDuration);
        
        // Check for double tap
        const currentTime = Date.now();
        const tapDistance = this.getDistance(
            { x: touch.clientX, y: touch.clientY },
            this.gestureState.lastTapPosition
        );
        
        if (currentTime - this.gestureState.lastTapTime < this.config.doubleTapMaxDelay &&
            tapDistance < this.config.doubleTapMaxDistance) {
            clearTimeout(this.gestureState.doubleTapTimeout);
            this.triggerDoubleTap(touch.clientX, touch.clientY);
        } else {
            this.gestureState.doubleTapTimeout = setTimeout(() => {
                this.gestureState.lastTapTime = currentTime;
                this.gestureState.lastTapPosition = { x: touch.clientX, y: touch.clientY };
            }, this.config.doubleTapMaxDelay);
        }
        
        // Add active class to element
        if (this.gestureState.activeElement) {
            this.gestureState.activeElement.classList.add('gesture-active');
        }
    }
    
    handleTouchMove(event) {
        if (!this.gestureState.startX || !this.gestureState.startY) return;
        
        const touch = event.touches[0];
        const deltaTime = event.timeStamp - this.gestureState.lastTimestamp;
        
        // Calculate velocity
        this.gestureState.velocityX = (touch.clientX - this.gestureState.currentX) / deltaTime;
        this.gestureState.velocityY = (touch.clientY - this.gestureState.currentY) / deltaTime;
        
        this.gestureState.currentX = touch.clientX;
        this.gestureState.currentY = touch.clientY;
        this.gestureState.lastTimestamp = event.timeStamp;
        
        const deltaX = touch.clientX - this.gestureState.startX;
        const deltaY = touch.clientY - this.gestureState.startY;
        
        // Cancel long press if moved too much
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            clearTimeout(this.gestureState.longPressTimeout);
        }
        
        // Determine gesture type
        if (!this.gestureState.gestureType) {
            if (Math.abs(deltaX) > this.config.swipeThreshold || 
                Math.abs(deltaY) > this.config.swipeThreshold) {
                this.gestureState.isSwiping = true;
                
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    this.gestureState.gestureType = 'swipe-horizontal';
                } else {
                    this.gestureState.gestureType = 'swipe-vertical';
                }
                
                // Cancel any pending click events
                event.preventDefault();
            }
        }
        
        // Handle ongoing swipe
        if (this.gestureState.isSwiping) {
            this.handleSwipeMove(deltaX, deltaY);
        }
    }
    
    handleTouchEnd(event) {
        clearTimeout(this.gestureState.longPressTimeout);
        
        const deltaX = this.gestureState.currentX - this.gestureState.startX;
        const deltaY = this.gestureState.currentY - this.gestureState.startY;
        
        // Trigger swipe if threshold met
        if (this.gestureState.isSwiping) {
            this.handleSwipeEnd(deltaX, deltaY);
        }
        
        // Reset gesture state
        this.gestureState.isSwiping = false;
        this.gestureState.gestureType = null;
        this.gestureState.startX = 0;
        this.gestureState.startY = 0;
        this.gestureState.velocityX = 0;
        this.gestureState.velocityY = 0;
        
        // Remove active class
        if (this.gestureState.activeElement) {
            this.gestureState.activeElement.classList.remove('gesture-active');
            this.gestureState.activeElement = null;
        }
        
        // Hide any gesture indicators
        this.hideSwipeIndicator();
        this.hideEdgeSwipeBack();
    }
    
    handleMouseDown(event) {
        // Simulate touch for desktop
        this.handleTouchStart({
            touches: [{ clientX: event.clientX, clientY: event.clientY }],
            timeStamp: event.timeStamp
        });
    }
    
    handleMouseMove(event) {
        if (this.gestureState.startX === 0 && this.gestureState.startY === 0) return;
        
        this.handleTouchMove({
            touches: [{ clientX: event.clientX, clientY: event.clientY }],
            timeStamp: event.timeStamp,
            preventDefault: () => event.preventDefault()
        });
    }
    
    handleMouseUp(event) {
        this.handleTouchEnd({
            touches: [],
            changedTouches: [{ clientX: event.clientX, clientY: event.clientY }],
            timeStamp: event.timeStamp
        });
    }
    
    handlePinchStart(event) {
        if (event.touches.length !== 2) return;
        
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        this.gestureState.gestureType = 'pinch';
        this.gestureState.pinchStartDistance = this.getDistance(
            { x: touch1.clientX, y: touch1.clientY },
            { x: touch2.clientX, y: touch2.clientY }
        );
        this.gestureState.pinchStartScale = 1;
        this.gestureState.pinchCenter = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
        
        if (this.callbacks.onPinchStart) {
            this.callbacks.onPinchStart({
                center: this.gestureState.pinchCenter,
                scale: 1
            });
        }
    }
    
    handlePinchMove(event) {
        if (event.touches.length !== 2 || this.gestureState.gestureType !== 'pinch') return;
        
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        const currentDistance = this.getDistance(
            { x: touch1.clientX, y: touch1.clientY },
            { x: touch2.clientX, y: touch2.clientY }
        );
        
        const scale = currentDistance / this.gestureState.pinchStartDistance;
        const deltaScale = scale - this.gestureState.pinchStartScale;
        
        if (Math.abs(deltaScale) > this.recognizers.pinch.threshold) {
            this.gestureState.pinchStartScale = scale;
            
            if (this.callbacks.onPinchChange) {
                this.callbacks.onPinchChange({
                    center: this.gestureState.pinchCenter,
                    scale: scale,
                    delta: deltaScale
                });
            }
        }
    }
    
    handleSwipeMove(deltaX, deltaY) {
        // Apply boundaries
        const limitedDeltaX = this.applyBoundaries(deltaX, 'horizontal');
        const limitedDeltaY = this.applyBoundaries(deltaY, 'vertical');
        
        // Update UI based on swipe
        this.updateSwipeUI(limitedDeltaX, limitedDeltaY);
        
        // Check for chat item swipe
        const element = this.gestureState.activeElement;
        if (element && element.classList.contains('chat-item')) {
            this.handleChatSwipe(element, limitedDeltaX);
        }
    }
    
    handleSwipeEnd(deltaX, deltaY) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        const velocityX = Math.abs(this.gestureState.velocityX);
        const velocityY = Math.abs(this.gestureState.velocityY);
        
        // Determine if it's a valid swipe
        const isHorizontalSwipe = absDeltaX > absDeltaY;
        const isFastSwipe = isHorizontalSwipe ? velocityX > 0.5 : velocityY > 0.5;
        const isLongSwipe = isHorizontalSwipe ? absDeltaX > 80 : absDeltaY > 80;
        
        if ((isLongSwipe || isFastSwipe) && absDeltaX > this.config.swipeThreshold) {
            if (deltaX > 0) {
                this.triggerSwipeRight(deltaX);
            } else {
                this.triggerSwipeLeft(Math.abs(deltaX));
            }
        } else if ((isLongSwipe || isFastSwipe) && absDeltaY > this.config.swipeThreshold) {
            if (deltaY > 0) {
                this.triggerSwipeDown(Math.abs(deltaY));
            } else {
                this.triggerSwipeUp(Math.abs(deltaY));
            }
        }
        
        // Apply inertia for chat swipes
        if (this.gestureState.activeElement && this.gestureState.activeElement.classList.contains('chat-item')) {
            this.applySwipeInertia(deltaX);
        }
        
        this.hideSwipeIndicator();
    }
    
    handleChatSwipe(chatItem, deltaX) {
        // Limit swipe distance
        const maxSwipe = this.gestureState.maxSwipeDistance;
        const swipeDistance = Math.min(Math.max(-maxSwipe, deltaX), maxSwipe);
        
        // Update transform
        chatItem.style.transform = `translateX(${swipeDistance}px)`;
        
        // Update swipe actions opacity
        const swipeActions = chatItem.querySelector('.swipe-actions');
        if (swipeActions) {
            const opacity = Math.min(Math.abs(swipeDistance) / maxSwipe, 1);
            swipeActions.style.opacity = opacity;
            
            // Scale actions based on distance
            const actions = swipeActions.querySelectorAll('.swipe-action');
            const scale = 0.8 + (0.2 * opacity);
            actions.forEach(action => {
                action.style.transform = `scale(${scale})`;
            });
            
            // Highlight action based on direction
            if (swipeDistance < -40) {
                swipeActions.querySelector('.swipe-delete').style.background = '#F44336';
                swipeActions.querySelector('.swipe-archive').style.background = '#757575';
            } else if (swipeDistance > 40) {
                swipeActions.querySelector('.swipe-archive').style.background = '#4CAF50';
                swipeActions.querySelector('.swipe-delete').style.background = '#757575';
            } else {
                swipeActions.querySelector('.swipe-archive').style.background = '#757575';
                swipeActions.querySelector('.swipe-delete').style.background = '#757575';
            }
        }
    }
    
    applySwipeInertia(deltaX) {
        const velocity = Math.abs(this.gestureState.velocityX);
        
        if (velocity > this.config.minVelocityForInertia) {
            const chatItem = this.gestureState.activeElement;
            const direction = deltaX > 0 ? 1 : -1;
            let inertiaDistance = velocity * 200; // Convert velocity to pixels
            
            const animateInertia = () => {
                inertiaDistance *= this.config.inertiaDeceleration;
                
                if (Math.abs(inertiaDistance) < 1) {
                    // Snap to nearest action
                    this.snapSwipeAction(chatItem);
                    return;
                }
                
                const currentTransform = this.getTransformX(chatItem);
                const newTransform = currentTransform + (inertiaDistance * direction);
                const boundedTransform = Math.min(Math.max(-this.gestureState.maxSwipeDistance, newTransform), 
                                                 this.gestureState.maxSwipeDistance);
                
                chatItem.style.transform = `translateX(${boundedTransform}px)`;
                
                requestAnimationFrame(animateInertia);
            };
            
            requestAnimationFrame(animateInertia);
        } else {
            // Snap immediately
            this.snapSwipeAction(this.gestureState.activeElement);
        }
    }
    
    snapSwipeAction(chatItem) {
        const currentTransform = this.getTransformX(chatItem);
        const absTransform = Math.abs(currentTransform);
        const threshold = this.gestureState.maxSwipeDistance / 2;
        
        let targetTransform = 0;
        
        if (absTransform > threshold) {
            targetTransform = currentTransform > 0 ? 
                this.gestureState.maxSwipeDistance : 
                -this.gestureState.maxSwipeDistance;
            
            // Trigger action after snap
            setTimeout(() => {
                const chatId = chatItem.dataset.id;
                if (targetTransform > 0) {
                    this.archiveChat(chatId);
                } else {
                    this.deleteChat(chatId);
                }
            }, 150);
        }
        
        // Animate to target
        this.animateSwipe(chatItem, currentTransform, targetTransform);
    }
    
    animateSwipe(element, from, to, duration = 150) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeProgress = this.easeOutCubic(progress);
            const currentX = from + (to - from) * easeProgress;
            
            element.style.transform = `translateX(${currentX}px)`;
            
            // Update swipe actions opacity
            const swipeActions = element.querySelector('.swipe-actions');
            if (swipeActions) {
                const opacity = Math.min(Math.abs(currentX) / this.gestureState.maxSwipeDistance, 1);
                swipeActions.style.opacity = opacity;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    getTransformX(element) {
        if (!element.style.transform) return 0;
        
        const match = element.style.transform.match(/translateX\(([^)]+)px\)/);
        return match ? parseFloat(match[1]) : 0;
    }
    
    handleKeyGesture(event) {
        // Keyboard shortcuts for accessibility
        switch(event.key) {
            case 'ArrowLeft':
                if (event.ctrlKey) this.triggerSwipeLeft(100);
                break;
            case 'ArrowRight':
                if (event.ctrlKey) this.triggerSwipeRight(100);
                break;
            case 'Delete':
                if (event.ctrlKey && this.gestureState.activeElement) {
                    const chatId = this.gestureState.activeElement.dataset.id;
                    this.deleteChat(chatId);
                }
                break;
            case 'a':
                if (event.ctrlKey && this.gestureState.activeElement) {
                    const chatId = this.gestureState.activeElement.dataset.id;
                    this.archiveChat(chatId);
                }
                break;
        }
    }
    
    // === GESTURE TRIGGERS ===
    
    triggerSwipeLeft(distance) {
        console.log('👈 Swipe left:', distance);
        
        if (this.callbacks.onSwipeLeft) {
            this.callbacks.onSwipeLeft({ distance, velocity: this.gestureState.velocityX });
        } else {
            // Default behavior: navigate to next tab
            if (window.app) {
                window.app.swipeLeft();
            }
        }
        
        this.showSwipeIndicator('left', distance);
    }
    
    triggerSwipeRight(distance) {
        console.log('👉 Swipe right:', distance);
        
        if (this.callbacks.onSwipeRight) {
            this.callbacks.onSwipeRight({ distance, velocity: this.gestureState.velocityX });
        } else {
            // Default behavior: navigate to previous tab
            if (window.app) {
                window.app.swipeRight();
            }
        }
        
        this.showSwipeIndicator('right', distance);
    }
    
    triggerSwipeUp(distance) {
        console.log('👆 Swipe up:', distance);
        
        if (this.callbacks.onSwipeUp) {
            this.callbacks.onSwipeUp({ distance, velocity: this.gestureState.velocityY });
        }
        
        this.showSwipeIndicator('up', distance);
    }
    
    triggerSwipeDown(distance) {
        console.log('👇 Swipe down:', distance);
        
        if (this.callbacks.onSwipeDown) {
            this.callbacks.onSwipeDown({ distance, velocity: this.gestureState.velocityY });
        }
        
        this.showSwipeIndicator('down', distance);
    }
    
    triggerLongPress(x, y) {
        console.log('⏱️ Long press at:', x, y);
        
        this.gestureState.gestureType = 'long-press';
        
        if (this.callbacks.onLongPress) {
            this.callbacks.onLongPress({ x, y, element: this.gestureState.activeElement });
        } else {
            // Default behavior: show context menu
            this.showContextMenu(x, y);
        }
        
        this.showLongPressIndicator(x, y);
    }
    
    triggerDoubleTap(x, y) {
        console.log('👆👆 Double tap at:', x, y);
        
        if (this.callbacks.onDoubleTap) {
            this.callbacks.onDoubleTap({ x, y, element: this.gestureState.activeElement });
        } else {
            // Default behavior: zoom or select
            const element = this.getElementFromPoint(x, y);
            if (element && element.classList.contains('chat-item')) {
                this.toggleChatSelection(element.dataset.id);
            }
        }
    }
    
    triggerPullToRefresh() {
        console.log('🔄 Pull to refresh');
        
        if (this.callbacks.onPullToRefresh) {
            this.callbacks.onPullToRefresh();
        } else if (window.app) {
            window.app.refreshData();
        }
    }
    
    // === UI FEEDBACK ===
    
    showSwipeIndicator(direction, distance) {
        // Create or update swipe indicator
        let indicator = document.getElementById('swipe-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'swipe-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 24px;
                z-index: 10000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
            `;
            document.body.appendChild(indicator);
        }
        
        const icons = {
            left: '←',
            right: '→',
            up: '↑',
            down: '↓'
        };
        
        indicator.textContent = `${icons[direction]} ${Math.round(distance)}px`;
        indicator.style.opacity = '1';
        
        // Hide after delay
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 300);
    }
    
    hideSwipeIndicator() {
        const indicator = document.getElementById('swipe-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
        }
    }
    
    showLongPressIndicator(x, y) {
        // Create ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'gesture-ripple';
        ripple.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(0, 128, 105, 0.3);
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 9999;
        `;
        
        document.body.appendChild(ripple);
        
        // Animate ripple
        requestAnimationFrame(() => {
            ripple.style.width = '100px';
            ripple.style.height = '100px';
            ripple.style.opacity = '0';
            ripple.style.transition = 'all 0.5s ease-out';
            
            // Remove after animation
            setTimeout(() => {
                ripple.remove();
            }, 500);
        });
    }
    
    showPullToRefresh(distance) {
        let pullIndicator = document.getElementById('pull-to-refresh');
        
        if (!pullIndicator) {
            pullIndicator = document.createElement('div');
            pullIndicator.id = 'pull-to-refresh';
            pullIndicator.innerHTML = `
                <div class="pull-icon">↻</div>
                <div class="pull-text">Pull to refresh</div>
            `;
            pullIndicator.style.cssText = `
                position: absolute;
                top: -60px;
                left: 0;
                right: 0;
                height: 60px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: var(--wa-text-secondary);
                z-index: 100;
            `;
            
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.appendChild(pullIndicator);
            }
        }
        
        // Rotate icon based on pull distance
        const icon = pullIndicator.querySelector('.pull-icon');
        const rotation = Math.min(distance / 2, 180);
        icon.style.transform = `rotate(${rotation}deg)`;
        
        // Change text when ready to refresh
        const text = pullIndicator.querySelector('.pull-text');
        if (distance > 100) {
            text.textContent = 'Release to refresh';
            text.style.color = 'var(--wa-primary)';
        } else {
            text.textContent = 'Pull to refresh';
            text.style.color = 'var(--wa-text-secondary)';
        }
    }
    
    hidePullToRefresh() {
        const pullIndicator = document.getElementById('pull-to-refresh');
        if (pullIndicator) {
            pullIndicator.style.transition = 'transform 0.3s ease';
            pullIndicator.style.transform = 'translateY(-60px)';
            
            setTimeout(() => {
                pullIndicator.remove();
            }, 300);
        }
    }
    
    showEdgeSwipeBack(distance) {
        // iOS-style back gesture indicator
        let edgeIndicator = document.getElementById('edge-swipe-back');
        
        if (!edgeIndicator) {
            edgeIndicator = document.createElement('div');
            edgeIndicator.id = 'edge-swipe-back';
            edgeIndicator.innerHTML = '←';
            edgeIndicator.style.cssText = `
                position: fixed;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 30px;
                height: 30px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border-radius: 0 15px 15px 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(edgeIndicator);
        }
        
        edgeIndicator.style.opacity = Math.min(distance / 100, 1);
        edgeIndicator.style.transform = `translateY(-50%) translateX(${Math.min(distance - 30, 100)}px)`;
    }
    
    hideEdgeSwipeBack() {
        const edgeIndicator = document.getElementById('edge-swipe-back');
        if (edgeIndicator) {
            edgeIndicator.style.opacity = '0';
            setTimeout(() => {
                edgeIndicator.remove();
            }, 300);
        }
    }
    
    showContextMenu(x, y) {
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'gesture-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: var(--wa-surface);
            border: 1px solid var(--wa-border);
            border-radius: 8px;
            box-shadow: var(--wa-shadow-lg);
            min-width: 150px;
            z-index: 10000;
            transform: translate(-50%, 10px);
            opacity: 0;
            transition: all 0.2s ease;
        `;
        
        menu.innerHTML = `
            <div class="menu-item">Reply</div>
            <div class="menu-item">Forward</div>
            <div class="menu-item">Copy</div>
            <div class="menu-divider"></div>
            <div class="menu-item">Delete</div>
            <div class="menu-item">Archive</div>
        `;
        
        document.body.appendChild(menu);
        
        // Animate in
        requestAnimationFrame(() => {
            menu.style.transform = 'translate(-50%, 0)';
            menu.style.opacity = '1';
        });
        
        // Close when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.style.opacity = '0';
                menu.style.transform = 'translate(-50%, 10px)';
                
                setTimeout(() => {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }, 200);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }
    
    // === HELPER FUNCTIONS ===
    
    getElementFromPoint(x, y) {
        // Temporarily hide any gesture indicators
        const indicators = document.querySelectorAll('.gesture-indicator');
        indicators.forEach(ind => ind.style.display = 'none');
        
        const element = document.elementFromPoint(x, y);
        
        // Restore indicators
        indicators.forEach(ind => ind.style.display = '');
        
        return element;
    }
    
    getDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    applyBoundaries(delta, axis) {
        const maxOverscroll = this.config.elasticBoundary;
        
        if (axis === 'horizontal') {
            // Allow some overscroll with elastic effect
            if (Math.abs(delta) > maxOverscroll) {
                const overscroll = Math.abs(delta) - maxOverscroll;
                const dampedOverscroll = maxOverscroll + (overscroll * this.config.overscrollDamping);
                return delta > 0 ? dampedOverscroll : -dampedOverscroll;
            }
        }
        
        return delta;
    }
    
    updateSwipeUI(deltaX, deltaY) {
        // Update any visual feedback for ongoing swipe
        // This could be used for custom swipe indicators
    }
    
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    // === CHAT ACTIONS ===
    
    archiveChat(chatId) {
        if (window.app) {
            window.app.archiveSelectedChats();
        }
    }
    
    deleteChat(chatId) {
        if (window.app) {
            window.app.deleteSelectedChats();
        }
    }
    
    toggleChatSelection(chatId) {
        if (window.app) {
            window.app.toggleChatSelection(chatId);
        }
    }
    
    // === PUBLIC API ===
    
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = callback;
        }
    }
    
    off(event) {
        if (this.callbacks[event]) {
            this.callbacks[event] = null;
        }
    }
    
    enableGesture(gesture) {
        if (this.recognizers[gesture]) {
            this.recognizers[gesture].enabled = true;
        }
    }
    
    disableGesture(gesture) {
        if (this.recognizers[gesture]) {
            this.recognizers[gesture].enabled = false;
        }
    }
    
    setThreshold(gesture, value) {
        if (this.recognizers[gesture]) {
            this.recognizers[gesture].threshold = value;
        }
    }
}

// === INITIALIZE GESTURES ===
document.addEventListener('DOMContentLoaded', () => {
    // Initialize gesture system
    window.gestures = new WhatsAppGestures();
    
    // Add CSS for gestures
    const gestureStyles = document.createElement('style');
    gestureStyles.textContent = `
        /* Gesture active state */
        .gesture-active {
            transition: none !important;
        }
        
        /* Swipe actions */
        .swipe-actions {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            display: flex;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        }
        
        .swipe-action {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            color: white;
            font-weight: var(--wa-font-weight-bold);
            transition: transform 0.2s;
        }
        
        .swipe-archive {
            background: #757575;
        }
        
        .swipe-delete {
            background: #757575;
        }
        
        /* Chat item swipe states */
        .chat-item.swiping {
            transition: transform 0.1s;
        }
        
        /* Pull to refresh */
        .pull-icon {
            font-size: 24px;
            margin-bottom: 4px;
            transition: transform 0.2s;
        }
        
        .pull-text {
            font-size: var(--wa-font-size-sm);
        }
        
        /* Context menu */
        .gesture-context-menu {
            font-family: var(--wa-font-family);
        }
        
        .menu-item {
            padding: var(--wa-space-md) var(--wa-space-lg);
            cursor: pointer;
            transition: background-color 0.1s;
            font-size: var(--wa-font-size-md);
            color: var(--wa-text-primary);
        }
        
        .menu-item:hover {
            background: var(--wa-border-light);
        }
        
        .menu-divider {
            height: 1px;
            background: var(--wa-border);
            margin: var(--wa-space-xs) 0;
        }
        
        /* Ripple effect */
        .gesture-ripple {
            position: fixed;
            border-radius: 50%;
            background: rgba(0, 128, 105, 0.3);
            pointer-events: none;
            z-index: 9999;
        }
        
        /* Edge swipe */
        .edge-swipe-area {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 30px;
            z-index: 9998;
        }
        
        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
            .chat-item,
            .swipe-action,
            .gesture-ripple,
            .gesture-context-menu {
                transition: none !important;
                animation: none !important;
            }
        }
        
        /* High contrast mode */
        @media (prefers-contrast: high) {
            .swipe-action {
                border: 2px solid currentColor;
            }
            
            .gesture-context-menu {
                border: 2px solid currentColor;
            }
        }
    `;
    document.head.appendChild(gestureStyles);
    
    console.log('👆 WhatsApp Gestures initialized');
});
