window.onload = () => {
    new ViewModel();
}

class ViewModel{
    constructor(){
        this.count = new OneWayProp(0);
        this.text = new TwoWayProp(null, 'string');
        this.select = new TwoWayProp(1);
        this.radio = new TwoWayProp(1);
        this.items = new OneWayCollectionProp([{name: 'Victor'}, {name: 'Carlos'}, {name: 'Luis'}]);

        this.interval = setInterval(() => {
            this.count.value = this.count.value + 1;
            if(this.count.value == 10){
                clearInterval(this.interval);
            }
        }, 1000);

        setTimeout(() => {
            this.items.value = [{name: 'Victor'}, {name: 'Carlos'}, {name: 'Luis'}, {name: 'Diana'}];
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
            this.text.value = '';
        });
    }
}



class OneWayProp{
    #observers;    
    #value;
    #type;

    constructor(value, type, formatFunctions){
        //Subscribed DOM elements
        this.#observers = [];

        //Value stored in the property
        this.#value = value;

        //Data type of property
        this.#type = type;

        //Collection of functions that can format the value for different displays or elements
        this._formatFunctions = formatFunctions;
    }

    get value(){
        return this.#value;
    }

    set value(value) {
        this._set(value);
    }

    //Add single DOM element to observers and set its value immediately after subscription
    subscribe(element){
        this.#observers.push(element);
        this._setElementValue(element, this.#value);
    }

    //Add severals DOM elements to observers and set their value immediately after subscription
    subscribeMany(elements){
        for(let i = 0; i < elements.length; i++){
            this.subscribe(elements[i]);
        }
    }
    
    _set(value, origin){
        //If property doesn't specify the type it is automatically grabbed
        //by the passed value of this function, hence the type won't be restricted
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
                //Many DOM elements don't handle true or false but rather empty values
                //so we need to make sure we account for these
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

        //On property change, change the value for all observers except for the one element where the value change
        //came originally from, or excluding none if the property was changed programatically. This is to avoid
        //chain reactions in the functionality.
        const observers = this.#observers.filter((element) => origin == null || element != origin);
        for(let i = 0; i < observers.length; i++){
            this._setElementValue(observers[i], value);
        }
    }

    _setElementValue(element, value){
        //The value needs to be formatted with one of the format functions if said element
        ///specified using any of them in the collection. If not the element's value is set
        //equally to the property value
        if(this._formatFunctions && element.matches('[data-format]')){
            value = this._formatFunctions[element.getAttribute('data-format')](value);
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
}

class TwoWayProp extends OneWayProp{
    constructor(value, type, formatFunctions){
        super(value, type, formatFunctions);
    }

    subscribe(element){
        super.subscribe(element);
        this.#addTwoWay(element);
    }

    subscribeMany(elements){
        super.subscribeMany(elements)
        for(let i = 0; i < elements.length; i++){
            this.#addTwoWay(elements[i]);
        }
    }

    //Create event listeners for all observer DOM elements to change back the value of the property
    //when their value changes, hence, implementing two-way binding
    #addTwoWay(element){
        switch(element.tagName){
            case 'INPUT':
                if(element.matches('[type="checkbox"], [type="radio"]')){
                    element.addEventListener('change', (e) => {
                        this._set(e.target.value, e.target);
                    });
                }else{
                    element.addEventListener('input', (e) => {
                        this._set(e.target.value, e.target);
                    });
                }
                break;
            case 'SELECT':
                //Dropdowns on HTML don't handle the concept of null values, only empty strings.
                //On empty values we need to force the null value upon the property
                element.addEventListener('input', (e) => {
                    this._set(e.target.value != '' ? e.target.value : null, e.target);
                });
                break;
            case 'TEXTAREA':
                element.addEventListener('input', (e) => {
                    this._set(e.target.value, e.target);
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
        //Collection bindings work through HTML templates and are required.
        if(!element.getAttribute('data-template')){
            throw new Error('Subscriber element ' + element.tagName + ' does not have required data-template attribute');
        }

        super.subscribe(element);
    }

    subscribeMany(elements){
        for(let i = 0; i < elements.length; i++){
            //Collection bindings work through HTML templates and are required.
            if(!elements[i].getAttribute('data-template')){
                throw new Error('Subscriber element ' + elements[i].tagName + ' does not have required data-template attribute');
            }

            super.subscribe(elements[i]);
        }
    }

    _setElementValue(element, collection){
        //Grab the specified template for the observer DOM element
        let template = document.querySelector('#' + element.getAttribute('data-template'));

        //Reset the inner HTML structure since it needs to refresh according to the collection
        element.innerHTML = '';
        for(let item of collection){
            //Make a copy of the template HTML structure for one item in the collection
            const node = template.content.cloneNode(true);
            
            //Grab all value attribute elements from the template that need to be filled with
            //the data provided by the current item in the collection
            for(let bindingChild of node.querySelectorAll('[data-value]')){
                const prop = bindingChild.getAttribute('data-value'); 
                const attr = bindingChild.getAttribute('data-attr');
                let value;

                if(prop){
                    //Properties can come from complex objects with several levels
                    //so the get property function recursively gets to the end value
                    //property separated by "." just like a JS object
                    value = this.#getProperty(item, prop.split('.'));
                }else{
                    value = item;
                }

                //Format functions can also be bound in a specific data item on the template
                if(this._formatFunctions && bindingChild.matches('[data-format]')){
                    value = this._formatFunctions[bindingChild.getAttribute('data-format')](value);
                }

                //The value can be set into the text node of the HTML element or inside a specified attribute
                if(attr){
                    bindingChild.setAttribute(attr, value);
                }else{
                    bindingChild.textContent = value;
                }
            }

            //Add a copy of the template's entire HTML structure with all the computed values
            //into the parent HTML which represents the collection itself
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