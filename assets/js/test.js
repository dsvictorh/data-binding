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



class OneWayProp{
    #observers;
    #value;
    #type;

    constructor(value, type, formatFunctions){
        this.#observers = [];
        this.#value = value;
        this.#type = type;
        this.formatFunctions = formatFunctions;
    }

    subscribe(element){
        this.#observers.push(element);
        this.setElementValue(element, this.#value);
    }

    subscribeMany(elements){
        for(let i = 0; i < elements.length; i++){
            this.subscribe(elements[i]);
        }
    }

    setElementValue(element, value){
        if(this.formatFunctions && element.matches('[data-format]')){
            value = this.formatFunctions[element.getAttribute('data-format')](value);
        }

        switch(element.tagName){
            case 'INPUT':
                if(element.matches('[type="checkbox"], [type="radio"]')){
                    element.checked = element.value == value;
                }else{
                    element.value = value;
                }
                break;
            case 'SELECT':
            case 'TEXTAREA':
                element.value = value;
                break;
            default:
                element.textContent = value;
                break;
        }
    }

    get(){
        return this.#value;
    }
    
    set(value, origin){
        let type = this.#type != null ? this.#type : typeof value;

        switch(type){
            case 'string':
                if(value != null){
                    value = value.toString();
                }
                break;
            case 'number':
                if(value != null){
                    value = parseFloat(value);
                    if(isNaN(value)){
                        throw new Error('Tried to set invalid number value');
                    }
                }
                break;
            case 'date':
                value = value || null;
                if(value != null){
                    value = new Date(value);
                }
                break;
            case 'boolean':
                if(typeof value !== 'boolean'){  
                    switch(value){
                        case 'true':
                            value = true;
                            break;
                        case 'false':
                            value = false;
                            break;
                        case '':
                        case null:
                            value = null; 
                            break;
                        default:
                            throw new Error('Tried to set invalid boolean value');
                    }
                }
                break;
        }

        this.#value = value;

        const observers = this.#observers.filter((element) => origin == null || element != origin);
        for(let i = 0; i < observers.length; i++){
            this.setElementValue(observers[i], value);
        }
    }
}

class TwoWayProp extends OneWayProp{
    constructor(value, type, formatFunctions){
        super(value, type, formatFunctions);
    }

    subscribe(element){
        super.subscribe(element);
        this.addTwoWay(element);
    }

    subscribeMany(elements){
        super.subscribeMany(elements)
        for(let i = 0; i < elements.length; i++){
            this.addTwoWay(elements[i]);
        }
    }

    addTwoWay(element){
        switch(element.tagName){
            case 'INPUT':
                if(element.matches('[type="checkbox"], [type="radio"]')){
                    element.addEventListener('change', (e) => {
                        this.set(e.target.value, e.target);
                    });
                }else{
                    element.addEventListener('input', (e) => {
                        this.set(e.target.value, e.target);
                    });
                }
                break;
            case 'SELECT':
                element.addEventListener('input', (e) => {
                    this.set(e.target.value != '' ? e.target.value : null, e.target);
                });
                break;
            case 'TEXTAREA':
                element.addEventListener('input', (e) => {
                    this.set(e.target.value, e.target);
                });
                break;
        }
    }
}

class OneWayCollectionProp extends OneWayProp{
    constructor(value, formatFunctions){
        super(value, 'array', formatFunctions);
        if(!Array.isArray(value)){
            throw new Error('Parameter value is not of type array');
        }
    }

    subscribe(element){
        if(!element.getAttribute('data-template')){
            throw new Error('Subscriber element ' + element.tagName + ' does not have required data-template attribute');
        }

        super.subscribe(element);
    }

    subscribeMany(elements){
        for(let i = 0; i < elements.length; i++){
            if(!elements[i].getAttribute('data-template')){
                throw new Error('Subscriber element ' + elements[i].tagName + ' does not have required data-template attribute');
            }

            super.subscribe(elements[i]);
        }
    }

    setElementValue(element, collection){
        let template = document.querySelector('#' + element.getAttribute('data-template'));

        element.innerHTML = '';
        for(let item of collection){
            const node = template.content.cloneNode(true);
            for(let bindingChild of node.querySelectorAll('[data-value]')){
                const prop = bindingChild.getAttribute('data-value'); 
                const attr = bindingChild.getAttribute('data-attr');
                let value;

                if(prop){
                    value = this.#getProperty(item, prop.split('.'));
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

    #getProperty(value, propStructure){ 
        for(let prop of propStructure){
            value = value[prop];
        }

        return value;
    }
}