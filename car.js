class Car {
    static #blueCarImage = new Image();
    static #blueDullCarImage = new Image();
    static #redCarImage = new Image();
    static #greenCarImage = new Image();
    static #purpleCarImage = new Image();
    static #pinkCarImage = new Image();
    
    // Load all car images
    static {
        this.#blueCarImage.src = "blue.png";
        this.#blueDullCarImage.src = "blue-dull.png";
        this.#redCarImage.src = "red.png";
        this.#greenCarImage.src = "green.png";
        this.#purpleCarImage.src = "purple.png";
        this.#pinkCarImage.src = "pink.png";
    }

    constructor(x, y, width, height, controlType, maxSpeed = 3, color = "red") {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.speed = 0;
        this.acceleration = 0.2;
        this.maxSpeed = maxSpeed;
        this.friction = 0.05;
        this.angle = 0;
        this.damaged = false;

        this.useBrain = controlType == "AI";
        
        // Use passed color for traffic cars
        if(controlType == "DUMMY") {
            this.color = color;
        }

        if(controlType != "DUMMY") {
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork(
                [this.sensor.rayCount, 6, 4]
            );
        }

        this.controls = new Controls(controlType);
    }

    update(roadBorders, traffic) {
        if(!this.damaged) {
            this.#move();
            this.polygon = this.#createPolygon();
            this.damaged = this.#assessDamage(roadBorders, traffic);
        }
        if(this.sensor) {
            this.sensor.update(roadBorders, traffic);
            const offsets = this.sensor.readings.map(
                s=>s==null?0:1-s.offset
            );
            const outputs = NeuralNetwork.feedForward(offsets, this.brain);
    

            if(this.useBrain) {
                this.controls.forward = outputs[0];
                this.controls.left = outputs[1];
                this.controls.right = outputs[2];
                this.controls.reverse = outputs[3];
            }
        }
    }

    #assessDamage(roadBorders, traffic) {
        for(let i = 0; i < roadBorders.length; i++) {
            if(polysIntersect(this.polygon, roadBorders[i])) {
                return true;
            }
        }
        for(let i = 0; i < traffic.length; i++) {
            if(polysIntersect(this.polygon, traffic[i].polygon)) {
                return true;
            }
        }
        return false;
    }

    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);
        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad, 
            y: this.y - Math.cos(this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad, 
            y: this.y - Math.cos(this.angle + alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad, 
            y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad, 
            y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad
        });
        return points;
    }

    #move() {
        if(this.controls.forward) {
            this.speed += this.acceleration;
        }
        if(this.controls.reverse) {
            this.speed -= this.acceleration;
        }
        if(this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if(this.speed < -this.maxSpeed/2) {
            this.speed = -this.maxSpeed/2;
        }
        if(this.speed > 0) {
            this.speed -= this.friction;
        }
        if(this.speed < 0) {
            this.speed += this.friction;
        }
        if(Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }
        if(this.speed != 0) {
            const flip = this.speed > 0 ? 1 : -1;
            if(this.controls.left) {
                this.angle += 0.03 * flip;
            }
            if(this.controls.right) {
                this.angle -= 0.03 * flip;
            }
        }

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    draw(ctx, color = "black", drawSensor = false, isBestCar = false) {
        // Draw sensors first (if they exist and should be drawn)
        if(this.sensor && drawSensor) {
            this.sensor.draw(ctx);
        }

        // Then draw the car image on top
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.angle);
        
        // Select the appropriate car image
        let carImage;
        if(color === "blue") {
            carImage = isBestCar ? Car.#blueCarImage : Car.#blueDullCarImage;
        } else {
            switch(this.color) {
                case "red": carImage = Car.#redCarImage; break;
                case "green": carImage = Car.#greenCarImage; break;
                case "purple": carImage = Car.#purpleCarImage; break;
                case "pink": carImage = Car.#pinkCarImage; break;
                default: carImage = Car.#redCarImage;
            }
        }
        
        if(this.damaged) {
            ctx.globalAlpha = 0.5;
        }
        
        const scaleFactor = 1.2;
        ctx.drawImage(
            carImage,
            -(this.width * scaleFactor)/2,
            -(this.height * scaleFactor)/2,
            this.width * scaleFactor,
            this.height * scaleFactor
        );
        ctx.restore();
    }
}
