class FurnitureConstructor {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();
        
        this.cabinet = null;
        this.elements = [];
        this.selectedElementType = null;
        this.draggingElement = null;
        this.isDragging = false;
        
        this.cabinetParams = {
            width: 2,
            height: 2.2,
            depth: 0.6,
            color: 0x8B4513
        };
        
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(4, 3, 4);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.updateRendererSize();
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        const container = document.getElementById('canvas-container');
        container.appendChild(this.renderer.domElement);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        this.setupLighting();
        
        this.raycaster = new THREE.Raycaster();
        
        const gridHelper = new THREE.GridHelper(10, 10);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);
        
        this.animate();
        
        window.addEventListener('resize', () => this.onWindowResize());
        
        setTimeout(() => {
            this.createCabinet();
        }, 100);
    }
    
    updateRendererSize() {
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, 5, -5);
        this.scene.add(pointLight);
    }
    
    createCabinet() {
        if (this.cabinet) {
            this.scene.remove(this.cabinet);
            this.elements.forEach(element => {
                if (element.mesh) this.scene.remove(element.mesh);
            });
            this.elements = [];
        }
        
        const width = this.cabinetParams.width;
        const height = this.cabinetParams.height;
        const depth = this.cabinetParams.depth;
        const color = this.cabinetParams.color;
        
        this.cabinet = new THREE.Group();
        const material = new THREE.MeshLambertMaterial({ color: color });
        const thickness = 0.02;
        
        // Задняя стенка
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, thickness),
            material
        );
        backWall.position.z = -depth / 2 + thickness / 2;
        backWall.position.y = height / 2;
        this.cabinet.add(backWall);
        
        // Боковые стенки
        const sideWallGeometry = new THREE.BoxGeometry(thickness, height, depth);
        
        const leftWall = new THREE.Mesh(sideWallGeometry, material);
        leftWall.position.x = -width / 2 + thickness / 2;
        leftWall.position.y = height / 2;
        this.cabinet.add(leftWall);
        
        const rightWall = new THREE.Mesh(sideWallGeometry, material);
        rightWall.position.x = width / 2 - thickness / 2;
        rightWall.position.y = height / 2;
        this.cabinet.add(rightWall);
        
        // Верх и низ
        const topBottomGeometry = new THREE.BoxGeometry(width, thickness, depth);
        
        const top = new THREE.Mesh(topBottomGeometry, material);
        top.position.y = height;
        this.cabinet.add(top);
        
        const bottom = new THREE.Mesh(topBottomGeometry, material);
        bottom.position.y = 0;
        this.cabinet.add(bottom);
        
        this.scene.add(this.cabinet);
        
        this.controls.target.set(0, height / 2, 0);
        this.camera.position.set(width * 1.5, height * 1.2, depth * 2);
        this.controls.update();
        
        this.updateStatus('Шкаф создан. Выберите элемент для добавления.');
    }
    
    createPreviewElement(type) {
        const element = {
            type: type,
            mesh: null,
            isPreview: true
        };
        
        let geometry, material;
        const thickness = 0.02;
        
        switch(type) {
            case 'shelf-horizontal':
                geometry = new THREE.BoxGeometry(0.5, thickness, this.cabinetParams.depth - thickness * 2);
                material = new THREE.MeshLambertMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.6
                });
                break;
                
            case 'shelf-vertical':
                geometry = new THREE.BoxGeometry(thickness, this.cabinetParams.height, this.cabinetParams.depth - thickness * 2);
                material = new THREE.MeshLambertMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.6
                });
                break;
                
            case 'drawer':
                geometry = new THREE.BoxGeometry(0.5, 0.15, this.cabinetParams.depth * 0.7);
                material = new THREE.MeshLambertMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.6
                });
                break;
        }
        
        element.mesh = new THREE.Mesh(geometry, material);
        element.mesh.position.set(0, this.cabinetParams.height / 2, 0);
        element.mesh.visible = true;
        
        this.scene.add(element.mesh);
        return element;
    }
    
    // Расчет размеров нового элемента с учетом существующих элементов - БЕЗ ЗАЗОРОВ
    calculateElementDimensions(type, position) {
        const thickness = 0.02;
        const cabinetWidth = this.cabinetParams.width;
        const cabinetHeight = this.cabinetParams.height;
        const cabinetDepth = this.cabinetParams.depth;
        
        let width, height, depth;
        
        switch(type) {
            case 'shelf-horizontal':
                width = this.calculateAvailableWidth(position);
                height = thickness;
                depth = cabinetDepth - thickness * 2;
                break;
                
            case 'shelf-vertical':
                height = this.calculateAvailableHeight(position);
                width = thickness;
                depth = cabinetDepth - thickness * 2;
                break;
                
            case 'drawer':
                width = this.calculateAvailableWidth(position);
                height = 0.15;
                depth = cabinetDepth * 0.7;
                break;
        }
        
        return { width, height, depth };
    }
    
    // УЛУЧШЕННЫЙ расчет доступной ширины - учитывает реальную высоту вертикальных полок
    calculateAvailableWidth(position) {
        const thickness = 0.02;
        const cabinetWidth = this.cabinetParams.width;
        
        // Находим все вертикальные полки, которые действительно ограничивают текущую позицию
        const relevantVerticalElements = this.getRelevantVerticalElements(position);
        
        if (relevantVerticalElements.length === 0) {
            // Если нет ограничивающих вертикальных полок, доступна вся ширина
            return cabinetWidth - thickness * 2;
        }
        
        // Сортируем вертикальные полки по X координате
        relevantVerticalElements.sort((a, b) => a.mesh.position.x - b.mesh.position.x);
        
        // Находим ближайшую вертикальную полку слева и справа
        let leftBound = -cabinetWidth / 2 + thickness;
        let rightBound = cabinetWidth / 2 - thickness;
        
        for (const vertEl of relevantVerticalElements) {
            if (vertEl.mesh.position.x < position.x) {
                leftBound = Math.max(leftBound, vertEl.mesh.position.x);
            }
            if (vertEl.mesh.position.x > position.x) {
                rightBound = Math.min(rightBound, vertEl.mesh.position.x);
                // Не прерываем цикл, чтобы найти самую близкую справа
            }
        }
        
        return Math.max(0.1, rightBound - leftBound);
    }
    
    // УЛУЧШЕННЫЙ расчет доступной высоты - учитывает реальную ширину горизонтальных полок
    calculateAvailableHeight(position) {
        const thickness = 0.02;
        const cabinetHeight = this.cabinetParams.height;
        
        // Находим все горизонтальные элементы, которые действительно ограничивают текущую позицию
        const relevantHorizontalElements = this.getRelevantHorizontalElements(position);
        
        if (relevantHorizontalElements.length === 0) {
            // Если нет ограничивающих горизонтальных элементов, доступна вся высота
            return cabinetHeight - thickness * 2;
        }
        
        // Сортируем горизонтальные элементы по Y координате
        relevantHorizontalElements.sort((a, b) => a.mesh.position.y - b.mesh.position.y);
        
        // Находим ближайший горизонтальный элемент снизу и сверху
        let bottomBound = thickness;
        let topBound = cabinetHeight - thickness;
        
        for (const horEl of relevantHorizontalElements) {
            const elementHeight = horEl.type === 'drawer' ? 0.15 : thickness;
            
            if (horEl.mesh.position.y < position.y) {
                bottomBound = Math.max(bottomBound, horEl.mesh.position.y + elementHeight / 2);
            }
            if (horEl.mesh.position.y > position.y) {
                topBound = Math.min(topBound, horEl.mesh.position.y - elementHeight / 2);
                // Не прерываем цикл, чтобы найти самую близкую сверху
            }
        }
        
        return Math.max(0.1, topBound - bottomBound);
    }
    
    // НОВАЯ ФУНКЦИЯ: Находит вертикальные полки, которые действительно ограничивают текущую позицию
    getRelevantVerticalElements(position) {
        const relevantVerticals = [];
        
        for (const vertEl of this.elements.filter(el => el.type === 'shelf-vertical')) {
            // Получаем реальные границы вертикальной полки
            const vertBounds = this.getVerticalElementBounds(vertEl);
            
            // Если текущая позиция по Y находится в пределах вертикальной полки, она релевантна
            if (position.y >= vertBounds.bottom && position.y <= vertBounds.top) {
                relevantVerticals.push(vertEl);
            }
        }
        
        return relevantVerticals;
    }
    
    // НОВАЯ ФУНКЦИЯ: Находит горизонтальные элементы, которые действительно ограничивают текущую позицию
    getRelevantHorizontalElements(position) {
        const relevantHorizontals = [];
        
        for (const horEl of this.elements.filter(el => 
            el.type === 'shelf-horizontal' || el.type === 'drawer'
        )) {
            // Получаем реальные границы горизонтального элемента
            const horBounds = this.getHorizontalElementBounds(horEl);
            
            // Если текущая позиция по X находится в пределах горизонтального элемента, он релевантен
            if (position.x >= horBounds.left && position.x <= horBounds.right) {
                relevantHorizontals.push(horEl);
            }
        }
        
        return relevantHorizontals;
    }
    
    // НОВАЯ ФУНКЦИЯ: Получает реальные границы вертикальной полки с учетом горизонтальных ограничений
    getVerticalElementBounds(verticalElement) {
        const thickness = 0.02;
        const cabinetHeight = this.cabinetParams.height;
        
        // Начальные границы - вся высота шкафа
        let topBound = cabinetHeight - thickness;
        let bottomBound = thickness;
        
        // Находим все горизонтальные элементы
        const horizontalElements = this.elements.filter(el => 
            el.type === 'shelf-horizontal' || el.type === 'drawer'
        );
        
        if (horizontalElements.length === 0) {
            return { top: topBound, bottom: bottomBound };
        }
        
        // Сортируем горизонтальные элементы по Y координате
        horizontalElements.sort((a, b) => a.mesh.position.y - b.mesh.position.y);
        
        // Находим горизонтальные элементы, которые ограничивают вертикальную полку
        for (const horEl of horizontalElements) {
            const elementHeight = horEl.type === 'drawer' ? 0.15 : thickness;
            const elementTop = horEl.mesh.position.y + elementHeight / 2;
            const elementBottom = horEl.mesh.position.y - elementHeight / 2;
            
            // Если горизонтальный элемент находится ниже вертикальной полки
            if (horEl.mesh.position.y < verticalElement.mesh.position.y) {
                bottomBound = Math.max(bottomBound, elementTop);
            }
            // Если горизонтальный элемент находится выше вертикальной полки
            if (horEl.mesh.position.y > verticalElement.mesh.position.y) {
                topBound = Math.min(topBound, elementBottom);
            }
        }
        
        return { top: topBound, bottom: bottomBound };
    }
    
    // НОВАЯ ФУНКЦИЯ: Получает реальные границы горизонтального элемента с учетом вертикальных ограничений
    getHorizontalElementBounds(horizontalElement) {
        const thickness = 0.02;
        const cabinetWidth = this.cabinetParams.width;
        
        // Начальные границы - вся ширина шкафа
        let leftBound = -cabinetWidth / 2 + thickness;
        let rightBound = cabinetWidth / 2 - thickness;
        
        // Находим все вертикальные элементы
        const verticalElements = this.elements.filter(el => el.type === 'shelf-vertical');
        
        if (verticalElements.length === 0) {
            return { left: leftBound, right: rightBound };
        }
        
        // Сортируем вертикальные элементы по X координате
        verticalElements.sort((a, b) => a.mesh.position.x - b.mesh.position.x);
        
        // Находим вертикальные элементы, которые ограничивают горизонтальную полку
        for (const vertEl of verticalElements) {
            // Если вертикальный элемент находится слева от горизонтальной полки
            if (vertEl.mesh.position.x < horizontalElement.mesh.position.x) {
                leftBound = Math.max(leftBound, vertEl.mesh.position.x);
            }
            // Если вертикальный элемент находится справа от горизонтальной полки
            if (vertEl.mesh.position.x > horizontalElement.mesh.position.x) {
                rightBound = Math.min(rightBound, vertEl.mesh.position.x);
            }
        }
        
        return { left: leftBound, right: rightBound };
    }
    
    // Обновление геометрии элемента превью с правильным позиционированием - БЕЗ ЗАЗОРОВ
    updateElementGeometry(element, position) {
        const newDimensions = this.calculateElementDimensions(element.type, position);
        
        element.mesh.geometry.dispose();
        element.mesh.geometry = new THREE.BoxGeometry(
            newDimensions.width,
            newDimensions.height,
            newDimensions.depth
        );
        
        // Корректируем позицию для вертикальных элементов - БЕЗ ЗАЗОРОВ
        if (element.type === 'shelf-vertical') {
            const thickness = 0.02;
            const cabinetHeight = this.cabinetParams.height;
            
            // Находим релевантные горизонтальные элементы для текущей позиции
            const relevantHorizontals = this.getRelevantHorizontalElements(position);
            
            if (relevantHorizontals.length > 0) {
                // Сортируем горизонтальные элементы по Y координате
                relevantHorizontals.sort((a, b) => a.mesh.position.y - b.mesh.position.y);
                
                // Находим ближайший горизонтальный элемент снизу
                let bottomBound = thickness;
                for (const horEl of relevantHorizontals) {
                    const elementHeight = horEl.type === 'drawer' ? 0.15 : thickness;
                    if (horEl.mesh.position.y < position.y) {
                        bottomBound = Math.max(bottomBound, horEl.mesh.position.y + elementHeight / 2);
                    }
                }
                
                // Устанавливаем позицию по Y в середину доступного пространства
                element.mesh.position.y = bottomBound + newDimensions.height / 2;
            } else {
                // Если нет горизонтальных элементов, центрируем по высоте
                element.mesh.position.y = cabinetHeight / 2;
            }
        }
        
        // Корректируем позицию для горизонтальных элементов - БЕЗ ЗАЗОРОВ
        if (element.type === 'shelf-horizontal' || element.type === 'drawer') {
            const thickness = 0.02;
            const cabinetWidth = this.cabinetParams.width;
            
            // Находим релевантные вертикальные элементы для текущей позиции
            const relevantVerticals = this.getRelevantVerticalElements(position);
            
            if (relevantVerticals.length > 0) {
                // Сортируем вертикальные элементы по X координате
                relevantVerticals.sort((a, b) => a.mesh.position.x - b.mesh.position.x);
                
                // Находим ближайшую вертикальную полку слева
                let leftBound = -cabinetWidth / 2 + thickness;
                for (const vertEl of relevantVerticals) {
                    if (vertEl.mesh.position.x < position.x) {
                        leftBound = Math.max(leftBound, vertEl.mesh.position.x);
                    }
                }
                
                // Устанавливаем позицию по X в середину доступного пространства
                element.mesh.position.x = leftBound + newDimensions.width / 2;
            } else {
                // Если нет вертикальных элементов, центрируем по ширине
                element.mesh.position.x = 0;
            }
        }
        
        return element;
    }
    
    getMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersectionPoint = new THREE.Vector3();
        
        if (this.raycaster.ray.intersectPlane(plane, intersectionPoint)) {
            return this.clampPositionToCabinet(intersectionPoint);
        }
        
        return null;
    }
    
    clampPositionToCabinet(position) {
        if (!this.draggingElement) return position;
        
        const width = this.cabinetParams.width;
        const height = this.cabinetParams.height;
        const depth = this.cabinetParams.depth;
        const thickness = 0.02;
        
        // Получаем размеры элемента
        const elementSize = new THREE.Vector3();
        const elementBox = new THREE.Box3().setFromObject(this.draggingElement.mesh);
        elementBox.getSize(elementSize);
        
        // Рассчитываем границы с учетом размеров элемента
        const minX = -width/2 + thickness + elementSize.x/2;
        const maxX = width/2 - thickness - elementSize.x/2;
        const minY = elementSize.y/2;
        const maxY = height - elementSize.y/2;
        const minZ = -depth/2 + thickness + elementSize.z/2;
        const maxZ = depth/2 - thickness - elementSize.z/2;
        
        position.x = Math.max(minX, Math.min(maxX, position.x));
        position.y = Math.max(minY, Math.min(maxY, position.y));
        position.z = Math.max(minZ, Math.min(maxZ, position.z));
        
        return position;
    }
    
    // УПРОЩЕННАЯ проверка - всегда разрешает размещение
    isValidPosition(position) {
        if (!this.cabinet) return false;
        
        // Проверяем только доступность пространства
        if (this.draggingElement.type === 'shelf-vertical') {
            const availableHeight = this.calculateAvailableHeight(position);
            if (availableHeight <= 0.01) {
                return false;
            }
        } else {
            const availableWidth = this.calculateAvailableWidth(position);
            if (availableWidth <= 0.01) {
                return false;
            }
        }
        
        // УБРАНА ПРОВЕРКА КОЛЛИЗИЙ - разрешаем размещение всегда
        return true;
    }
    
    setupEventListeners() {
        document.getElementById('createCabinet').addEventListener('click', () => {
            this.cabinetParams.width = parseFloat(document.getElementById('width').value) / 100;
            this.cabinetParams.height = parseFloat(document.getElementById('height').value) / 100;
            this.cabinetParams.depth = parseFloat(document.getElementById('depth').value) / 100;
            this.cabinetParams.color = parseInt(document.getElementById('color').value.replace('#', '0x'));
            
            this.createCabinet();
            this.stopDragging();
        });
        
        const elementItems = document.querySelectorAll('.element-item');
        elementItems.forEach(item => {
            item.addEventListener('click', () => {
                if (!this.cabinet) {
                    this.updateStatus('Сначала создайте шкаф!');
                    return;
                }
                
                elementItems.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                
                this.selectedElementType = item.getAttribute('data-type');
                
                if (this.draggingElement) {
                    this.scene.remove(this.draggingElement.mesh);
                }
                this.draggingElement = this.createPreviewElement(this.selectedElementType);
                
                this.startDragging();
                
                this.updateStatus(`Перетащите ${this.getElementName(this.selectedElementType)} в нужное место и ОТПУСТИТЕ кнопку мыши.`);
            });
        });
        
        const canvas = this.renderer.domElement;
        canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
        
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    getElementName(type) {
        const names = {
            'shelf-horizontal': 'Горизонтальная полка',
            'shelf-vertical': 'Вертикальная полка', 
            'drawer': 'Ящик'
        };
        return names[type] || 'Элемент';
    }
    
    onCanvasMouseMove(event) {
        if (this.draggingElement && this.draggingElement.mesh && this.isDragging) {
            const position = this.getMousePosition(event);
            if (position) {
                this.draggingElement.mesh.position.copy(position);
                this.updateElementGeometry(this.draggingElement, position);
                
                const isValid = this.isValidPosition(position);
                this.draggingElement.mesh.material.color.setHex(isValid ? 0x00ff00 : 0xff0000);
                
                this.updateStatus(isValid ? 
                    'Отпустите кнопку мыши чтобы разместить элемент' : 
                    'Невозможно разместить здесь - недостаточно места');
            }
        }
    }
    
    onCanvasMouseUp(event) {
        if (event.button === 0 && this.isDragging && this.draggingElement) {
            event.preventDefault();
            
            const position = this.draggingElement.mesh.position.clone();
            const isValid = this.isValidPosition(position);
            
            if (isValid) {
                this.placeElement(position);
                this.updateStatus('Элемент размещен! Выберите новый элемент.');
            } else {
                this.updateStatus('Невозможно разместить элемент здесь. Попробуйте другое место.');
            }
            
            this.stopDragging();
        }
    }
    
    startDragging() {
        this.isDragging = true;
        this.controls.enabled = false;
        document.getElementById('canvas-container').classList.add('dragging-element');
    }
    
    placeElement(position) {
        // Сохраняем текущие размеры и позицию из превью
        const currentDimensions = {
            width: this.draggingElement.mesh.geometry.parameters.width,
            height: this.draggingElement.mesh.geometry.parameters.height,
            depth: this.draggingElement.mesh.geometry.parameters.depth
        };
        
        const finalPosition = this.draggingElement.mesh.position.clone();
        
        const finalElement = {
            type: this.draggingElement.type,
            mesh: null,
            dimensions: currentDimensions
        };
        
        let geometry, material;
        
        // Используем текущие размеры из превью
        geometry = new THREE.BoxGeometry(
            currentDimensions.width,
            currentDimensions.height,
            currentDimensions.depth
        );
        
        switch(finalElement.type) {
            case 'shelf-horizontal':
                material = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
                break;
            case 'shelf-vertical':
                material = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
                break;
            case 'drawer':
                material = new THREE.MeshLambertMaterial({ color: 0xF5F5DC });
                break;
        }
        
        finalElement.mesh = new THREE.Mesh(geometry, material);
        finalElement.mesh.position.copy(finalPosition);
        finalElement.mesh.castShadow = true;
        finalElement.mesh.receiveShadow = true;
        
        this.scene.add(finalElement.mesh);
        this.elements.push(finalElement);
        
        this.scene.remove(this.draggingElement.mesh);
        this.draggingElement = null;
    }
    
    stopDragging() {
        this.isDragging = false;
        this.controls.enabled = true;
        document.getElementById('canvas-container').classList.remove('dragging-element');
        
        if (this.draggingElement) {
            this.scene.remove(this.draggingElement.mesh);
            this.draggingElement = null;
        }
    }
    
    updateStatus(message) {
        const statusPanel = document.getElementById('status-panel');
        if (statusPanel) {
            statusPanel.textContent = message;
        }
    }
    
    onWindowResize() {
        this.updateRendererSize();
        this.controls.update();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FurnitureConstructor();
});