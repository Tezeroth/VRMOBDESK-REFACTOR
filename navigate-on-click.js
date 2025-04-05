AFRAME.registerComponent('navigate-on-click', {
    schema: {
        target: { type: 'string' }, // Target URL
        hoverColor: { type: 'color', default: 'yellow' } // Hover color
    },
    init: function () {
        this.originalColors = new Map(); // Store original material colors or textures

        // Handle primitive geometries or models
        this.storeOriginalProperties();

        // Change material color on hover (works in non-VR and VR)
        this.el.addEventListener('mouseenter', () => {
            const mesh = this.el.getObject3D('mesh');
            if (mesh) {
                mesh.traverse((node) => {
                    if (node.isMesh) {
                        if (!this.originalColors.has(node)) {
                            this.originalColors.set(
                                node,
                                node.material.color ? node.material.color.clone() : null
                            );
                        }
                        if (node.material.color) {
                            node.material.color.set(this.data.hoverColor);
                        }
                    }
                });
            }
        });

        // Revert material color on mouse leave
        this.el.addEventListener('mouseleave', () => {
            const mesh = this.el.getObject3D('mesh');
            if (mesh) {
                mesh.traverse((node) => {
                    if (node.isMesh) {
                        const originalColor = this.originalColors.get(node);
                        if (originalColor) {
                            node.material.color.copy(originalColor);
                        }
                    }
                });
            }
        });

        // Handle navigation on mouse click (non-VR)
        this.el.addEventListener('click', (event) => {
            this.navigate();
            // Stop the event from propagating to underlying objects
            event.stopPropagation();
        });

        // Handle navigation via VR controller trigger (VR)
        this.el.sceneEl.addEventListener('triggerdown', (event) => {
            const controller = event.target; // The VR controller entity
            const intersected = controller.components.raycaster.intersectedEls[0];
            if (intersected === this.el) {
                this.navigate();
                // Stop the event from propagating to underlying objects
                event.stopPropagation();
            }
        });
    },

    navigate: function () {
        console.log('Navigate-on-click component received click for element:', this.el.id, 'Target:', this.data.target);
        if (this.data.target) {
            console.log(`Navigating to: ${this.data.target}`);
            window.location.href = this.data.target;
        } else {
            console.warn('No target URL specified for navigation.');
        }
    },

    storeOriginalProperties: function () {
        // For primitives, the mesh is immediately available
        const mesh = this.el.getObject3D('mesh');
        if (mesh) {
            mesh.traverse((node) => {
                if (node.isMesh && node.material.color) {
                    this.originalColors.set(node, node.material.color.clone());
                }
            });
        }

        // For models, wait for the `model-loaded` event
        this.el.addEventListener('model-loaded', () => {
            const mesh = this.el.getObject3D('mesh');
            if (mesh) {
                mesh.traverse((node) => {
                    if (node.isMesh && node.material.color) {
                        this.originalColors.set(node, node.material.color.clone());
                    }
                });
            }
        });
    }
});
