let viewModel;

window.onload = () => {
    viewModel = new ViewModel();
}

class ViewModel{
    constructor(){
        this.count = new OneWayProp(0);
        this.text = new TwoWayProp('');
        this.items = new OneWayCollectionProp([{name: 'Victor'}, {name: 'Carlos'}, {name: 'Luis'}]);

        this.interval = setInterval(() => {
            this.count.set(this.count.get() + 1);
            if(this.count.get() == 10){
                clearInterval(this.interval);
            }
        }, 1000);

        setTimeout(() => {
            this.items.set([{name: 'Victor'}, {name: 'Carlos'}, {name: 'Luis'}, {name: 'Diana'}]);
        }, 1000);

        this.registerBindings();
    }

    registerBindings() {
        this.count.subscribeMany(document.querySelectorAll('[data-prop="count"]'));
        this.text.subscribeMany(document.querySelectorAll('[data-prop="text"]'));
        this.items.subscribeMany(document.querySelectorAll('[data-prop="items"]'));

        document.querySelector('button').addEventListener('click', (e) => {
            this.text.set('');
        });
    }
}

class OneWayProp{
    constructor(value) {
        this.observers = [];
        this.value = value;
    }   
    
    subscribe(element) {
        this.observers.push(element);
    }

    subscribeMany(elements) {
        this.observers.push(...elements);
        this.set(this.value);
    }

    set(value) {
        this.value = value;
        for(let i = 0; i < this.observers.length; i++){
            this.setElementValue(this.observers[i], value);
        }
    }

    get() {
        return this.value;
    }

    setElementValue(element, value) {
        switch(element.tagName){
            case 'INPUT':
            case 'SELECT':
            case 'TEXTAREA':
                element.value = value;
                break;
            default:
                element.textContent = value;
                break;
        }
    }
}

class TwoWayProp extends OneWayProp{
    constructor(value) {
        super(value);
    }   
    
    subscribe(element) {
        super.subscribe(element);
        this.addTwoWay(element);
    }

    subscribeMany(elements) {
        super.subscribeMany(elements);
        for(let element of elements){
            this.addTwoWay(element);
        }
    }

    addTwoWay = (element) => {
        switch(element.tagName){
            case 'INPUT':
                if(element.matches('[type="checkbox"], [type="radio"]')){
                    element.addEventListener('change', (e) => {
                        this.set(e.target.value);
                    });
                }else{
                    element.addEventListener('input', (e) => {
                        this.set(e.target.value);
                    });
                }
                break;
            case 'SELECT':
            case 'TEXTAREA':
                element.addEventListener('input', (e) => {
                    this.set(e.target.value);
                });
                break;
        }
    }
}

class OneWayCollectionProp extends OneWayProp{
    constructor(value){
        super(value);
    }

    setElementValue(element, collection) {
        let template = document.querySelector(`#${element.getAttribute('data-template')}`);
        
        element.innerHTML = '';
        for(let item of collection){
            let node = template.content.cloneNode(true);
            for(let bindingChild of node.querySelectorAll('[data-value]')){
                const prop = bindingChild.getAttribute('data-value');
                if(prop){
                    bindingChild.textContent = item[prop];
                }else{
                    bindingChild.textContent = item;
                }
            }

            element.appendChild(node);
        }
    }
}