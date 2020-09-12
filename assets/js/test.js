let viewModel;

window.onload = () => {
    viewModel = new ViewModel();
}

class ViewModel{
    constructor(){
        this.count = new OneWayProp(0);
        this.text = new TwoWayProp('');
        this.select = new TwoWayProp(1);
        this.radio = new TwoWayProp(1);
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
        this.select.subscribeMany(document.querySelectorAll('[data-prop="select"]'));
        this.radio.subscribeMany(document.querySelectorAll('[data-prop="radio"]'));

        document.querySelector('button').addEventListener('click', (e) => {
            this.text.set('');
        });
    }
}


export class OneWayProp{
    constructor(value, type, formatFunctions) {
        this.observers = [];
        this.value = value;
        this.formatFunctions = formatFunctions;
        this.type = type;
    }   
    
    subscribe(element) {
        this.observers.push(element);
        this.setElementValue(element, this.value);
    }

    subscribeMany(elements) {
        this.observers.push(...elements);
        this.setElementValue(element, this.value);
    }

    set(value) {
        let type = this.type || typeof value;
        switch(type){
            case 'string':
                value = value.toString();
                break;
            case 'number':
                value = parseFloat(value);
                if(isNaN(value)){
                    throw new Error('Tried to set invalid number value');
                }
                break;
            case 'date':
                if(value){
                    value = new Date(value);
                }
                break;
        }

        this.value = value;
        for(let i = 0; i < this.observers.length; i++){
            this.setElementValue(this.observers[i], value);
        }
    }

    get() {
        return this.value;
    }

    setElementValue(element, value) {
        if(this.formatFunctions && element.matches('[data-format]')){
            value = this.formatFunctions[element.getAttribute('data-format')](value);
        }

        switch(element.tagName){
            case 'INPUT':
                if(element.matches('[type="radio"]')){
                    element.checked = element.value == value;
                    break;
                }
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

export class TwoWayProp extends OneWayProp{
    constructor(value, type, formatFunctions) {
        super(value, type, formatFunctions);
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

export class OneWayCollectionProp extends OneWayProp{
    constructor(value, formatFunctions){
        super(value, 'array', formatFunctions);
        if(!Array.isArray(value)){
            throw new Error('Parameter value is not of type array');
        }
    }

    setElementValue(element, collection) {
        let template = document.querySelector(`#${element.getAttribute('data-template')}`);
        
        element.innerHTML = '';
        for(let item of collection){
            let node = template.content.cloneNode(true);
            for(let bindingChild of node.querySelectorAll('[data-value]')){
                const prop = bindingChild.getAttribute('data-value');
                const attr = bindingChild.getAttribute('data-attr');
                let value;
                if(prop){
                    value = item[prop];
                }else{
                    value = item;
                }

                if(this.formatFunctions && bindingChild.matches('[data-format]')){
                    value = this.formatFunctions[bindingChild.getAttribute('data-format')](value);
                }

                if(attr){
                    bindingChild.setAttribute(attr, value);
                }else{
                    bindingChild.textContent = value;
                }
            }

            element.appendChild(node);
        }
    }
}