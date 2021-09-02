// canvas-confetti v1.4.0 built on 2021-03-10T12:32:33.488Z
!(function (window, module) {
    // source content
    (function main(global, module, isWorker, workerSize) {
        var canUseWorker = !!(
            global.Worker &&
            global.Blob &&
            global.Promise &&
            global.OffscreenCanvas &&
            global.OffscreenCanvasRenderingContext2D &&
            global.HTMLCanvasElement &&
            global.HTMLCanvasElement.prototype.transferControlToOffscreen &&
            global.URL &&
            global.URL.createObjectURL);

        function noop() {}

        // create a promise if it exists, otherwise, just
        // call the function directly
        function promise(func) {
            var ModulePromise = module.exports.Promise;
            var Prom = ModulePromise !== void 0 ? ModulePromise : global.Promise;

            if (typeof Prom === 'function') {
                return new Prom(func);
            }

            func(noop, noop);

            return null;
        }

        var raf = (function () {
            var TIME = Math.floor(1000 / 60);
            var frame, cancel;
            var frames = {};
            var lastFrameTime = 0;

            if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
                frame = function (cb) {
                    var id = Math.random();

                    frames[id] = requestAnimationFrame(function onFrame(time) {
                        if (lastFrameTime === time || lastFrameTime + TIME - 1 < time) {
                            lastFrameTime = time;
                            delete frames[id];

                            cb();
                        } else {
                            frames[id] = requestAnimationFrame(onFrame);
                        }
                    });

                    return id;
                };
                cancel = function (id) {
                    if (frames[id]) {
                        cancelAnimationFrame(frames[id]);
                    }
                };
            } else {
                frame = function (cb) {
                    return setTimeout(cb, TIME);
                };
                cancel = function (timer) {
                    return clearTimeout(timer);
                };
            }

            return {
                frame: frame,
                cancel: cancel
            };
        }());

        var getWorker = (function () {
            var worker;
            var prom;
            var resolves = {};

            function decorate(worker) {
                function execute(options, callback) {
                    worker.postMessage({
                        options: options || {},
                        callback: callback
                    });
                }
                worker.init = function initWorker(canvas) {
                    var offscreen = canvas.transferControlToOffscreen();
                    worker.postMessage({
                        canvas: offscreen
                    }, [offscreen]);
                };

                worker.fire = function fireWorker(options, size, done) {
                    if (prom) {
                        execute(options, null);
                        return prom;
                    }

                    var id = Math.random().toString(36).slice(2);

                    prom = promise(function (resolve) {
                        function workerDone(msg) {
                            if (msg.data.callback !== id) {
                                return;
                            }

                            delete resolves[id];
                            worker.removeEventListener('message', workerDone);

                            prom = null;
                            done();
                            resolve();
                        }

                        worker.addEventListener('message', workerDone);
                        execute(options, id);

                        resolves[id] = workerDone.bind(null, {
                            data: {
                                callback: id
                            }
                        });
                    });

                    return prom;
                };

                worker.reset = function resetWorker() {
                    worker.postMessage({
                        reset: true
                    });

                    for (var id in resolves) {
                        resolves[id]();
                        delete resolves[id];
                    }
                };
            }

            return function () {
                if (worker) {
                    return worker;
                }

                if (!isWorker && canUseWorker) {
                    var code = [
                        'var CONFETTI, SIZE = {}, module = {};',
                        '(' + main.toString() + ')(this, module, true, SIZE);',
                        'onmessage = function(msg) {',
                        '  if (msg.data.options) {',
                        '    CONFETTI(msg.data.options).then(function () {',
                        '      if (msg.data.callback) {',
                        '        postMessage({ callback: msg.data.callback });',
                        '      }',
                        '    });',
                        '  } else if (msg.data.reset) {',
                        '    CONFETTI.reset();',
                        '  } else if (msg.data.resize) {',
                        '    SIZE.width = msg.data.resize.width;',
                        '    SIZE.height = msg.data.resize.height;',
                        '  } else if (msg.data.canvas) {',
                        '    SIZE.width = msg.data.canvas.width;',
                        '    SIZE.height = msg.data.canvas.height;',
                        '    CONFETTI = module.exports.create(msg.data.canvas);',
                        '  }',
                        '}',
                    ].join('\n');
                    try {
                        worker = new Worker(URL.createObjectURL(new Blob([code])));
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        typeof console !== undefined && typeof console.warn === 'function' ? console.warn('🎊 Could not load worker', e) : null;

                        return null;
                    }

                    decorate(worker);
                }

                return worker;
            };
        })();

        var defaults = {
            particleCount: 50,
            angle: 90,
            spread: 45,
            startVelocity: 45,
            decay: 0.9,
            gravity: 1,
            drift: 0,
            ticks: 200,
            x: 0.5,
            y: 0.5,
            shapes: ['square', 'circle'],
            zIndex: 100,
            colors: [
                '#26ccff',
                '#a25afd',
                '#ff5e7e',
                '#88ff5a',
                '#fcff42',
                '#ffa62d',
                '#ff36ff'
            ],
            // probably should be true, but back-compat
            disableForReducedMotion: false,
            scalar: 1
        };

        function convert(val, transform) {
            return transform ? transform(val) : val;
        }

        function isOk(val) {
            return !(val === null || val === undefined);
        }

        function prop(options, name, transform) {
            return convert(
                options && isOk(options[name]) ? options[name] : defaults[name],
                transform
            );
        }

        function onlyPositiveInt(number) {
            return number < 0 ? 0 : Math.floor(number);
        }

        function randomInt(min, max) {
            // [min, max)
            return Math.floor(Math.random() * (max - min)) + min;
        }

        function toDecimal(str) {
            return parseInt(str, 16);
        }

        function colorsToRgb(colors) {
            return colors.map(hexToRgb);
        }

        function hexToRgb(str) {
            var val = String(str).replace(/[^0-9a-f]/gi, '');

            if (val.length < 6) {
                val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2];
            }

            return {
                r: toDecimal(val.substring(0, 2)),
                g: toDecimal(val.substring(2, 4)),
                b: toDecimal(val.substring(4, 6))
            };
        }

        function getOrigin(options) {
            var origin = prop(options, 'origin', Object);
            origin.x = prop(origin, 'x', Number);
            origin.y = prop(origin, 'y', Number);

            return origin;
        }

        function setCanvasWindowSize(canvas) {
            canvas.width = document.documentElement.clientWidth;
            canvas.height = document.documentElement.clientHeight;
        }

        function setCanvasRectSize(canvas) {
            var rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        function getCanvas(zIndex) {
            var canvas = document.createElement('canvas');

            canvas.style.position = 'fixed';
            canvas.style.top = '0px';
            canvas.style.left = '0px';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = zIndex;

            return canvas;
        }

        function ellipse(context, x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise) {
            context.save();
            context.translate(x, y);
            context.rotate(rotation);
            context.scale(radiusX, radiusY);
            context.arc(0, 0, 1, startAngle, endAngle, antiClockwise);
            context.restore();
        }

        function randomPhysics(opts) {
            var radAngle = opts.angle * (Math.PI / 180);
            var radSpread = opts.spread * (Math.PI / 180);

            return {
                x: opts.x,
                y: opts.y,
                wobble: Math.random() * 10,
                velocity: (opts.startVelocity * 0.5) + (Math.random() * opts.startVelocity),
                angle2D: -radAngle + ((0.5 * radSpread) - (Math.random() * radSpread)),
                tiltAngle: Math.random() * Math.PI,
                color: opts.color,
                shape: opts.shape,
                tick: 0,
                totalTicks: opts.ticks,
                decay: opts.decay,
                drift: opts.drift,
                random: Math.random() + 5,
                tiltSin: 0,
                tiltCos: 0,
                wobbleX: 0,
                wobbleY: 0,
                gravity: opts.gravity * 3,
                ovalScalar: 0.6,
                scalar: opts.scalar
            };
        }

        function updateFetti(context, fetti) {
            fetti.x += Math.cos(fetti.angle2D) * fetti.velocity + fetti.drift;
            fetti.y += Math.sin(fetti.angle2D) * fetti.velocity + fetti.gravity;
            fetti.wobble += 0.1;
            fetti.velocity *= fetti.decay;
            fetti.tiltAngle += 0.1;
            fetti.tiltSin = Math.sin(fetti.tiltAngle);
            fetti.tiltCos = Math.cos(fetti.tiltAngle);
            fetti.random = Math.random() + 5;
            fetti.wobbleX = fetti.x + ((10 * fetti.scalar) * Math.cos(fetti.wobble));
            fetti.wobbleY = fetti.y + ((10 * fetti.scalar) * Math.sin(fetti.wobble));

            var progress = (fetti.tick++) / fetti.totalTicks;

            var x1 = fetti.x + (fetti.random * fetti.tiltCos);
            var y1 = fetti.y + (fetti.random * fetti.tiltSin);
            var x2 = fetti.wobbleX + (fetti.random * fetti.tiltCos);
            var y2 = fetti.wobbleY + (fetti.random * fetti.tiltSin);

            context.fillStyle = 'rgba(' + fetti.color.r + ', ' + fetti.color.g + ', ' + fetti.color.b + ', ' + (1 - progress) + ')';
            context.beginPath();

            if (fetti.shape === 'circle') {
                context.ellipse ?
                    context.ellipse(fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI) :
                    ellipse(context, fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI);
            } else {
                context.moveTo(Math.floor(fetti.x), Math.floor(fetti.y));
                context.lineTo(Math.floor(fetti.wobbleX), Math.floor(y1));
                context.lineTo(Math.floor(x2), Math.floor(y2));
                context.lineTo(Math.floor(x1), Math.floor(fetti.wobbleY));
            }

            context.closePath();
            context.fill();

            return fetti.tick < fetti.totalTicks;
        }

        function animate(canvas, fettis, resizer, size, done) {
            var animatingFettis = fettis.slice();
            var context = canvas.getContext('2d');
            var animationFrame;
            var destroy;

            var prom = promise(function (resolve) {
                function onDone() {
                    animationFrame = destroy = null;

                    context.clearRect(0, 0, size.width, size.height);

                    done();
                    resolve();
                }

                function update() {
                    if (isWorker && !(size.width === workerSize.width && size.height === workerSize.height)) {
                        size.width = canvas.width = workerSize.width;
                        size.height = canvas.height = workerSize.height;
                    }

                    if (!size.width && !size.height) {
                        resizer(canvas);
                        size.width = canvas.width;
                        size.height = canvas.height;
                    }

                    context.clearRect(0, 0, size.width, size.height);

                    animatingFettis = animatingFettis.filter(function (fetti) {
                        return updateFetti(context, fetti);
                    });

                    if (animatingFettis.length) {
                        animationFrame = raf.frame(update);
                    } else {
                        onDone();
                    }
                }

                animationFrame = raf.frame(update);
                destroy = onDone;
            });

            return {
                addFettis: function (fettis) {
                    animatingFettis = animatingFettis.concat(fettis);

                    return prom;
                },
                canvas: canvas,
                promise: prom,
                reset: function () {
                    if (animationFrame) {
                        raf.cancel(animationFrame);
                    }

                    if (destroy) {
                        destroy();
                    }
                }
            };
        }

        function confettiCannon(canvas, globalOpts) {
            var isLibCanvas = !canvas;
            var allowResize = !!prop(globalOpts || {}, 'resize');
            var globalDisableForReducedMotion = prop(globalOpts, 'disableForReducedMotion', Boolean);
            var shouldUseWorker = canUseWorker && !!prop(globalOpts || {}, 'useWorker');
            var worker = shouldUseWorker ? getWorker() : null;
            var resizer = isLibCanvas ? setCanvasWindowSize : setCanvasRectSize;
            var initialized = (canvas && worker) ? !!canvas.__confetti_initialized : false;
            var preferLessMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion)').matches;
            var animationObj;

            function fireLocal(options, size, done) {
                var particleCount = prop(options, 'particleCount', onlyPositiveInt);
                var angle = prop(options, 'angle', Number);
                var spread = prop(options, 'spread', Number);
                var startVelocity = prop(options, 'startVelocity', Number);
                var decay = prop(options, 'decay', Number);
                var gravity = prop(options, 'gravity', Number);
                var drift = prop(options, 'drift', Number);
                var colors = prop(options, 'colors', colorsToRgb);
                var ticks = prop(options, 'ticks', Number);
                var shapes = prop(options, 'shapes');
                var scalar = prop(options, 'scalar');
                var origin = getOrigin(options);

                var temp = particleCount;
                var fettis = [];

                var startX = canvas.width * origin.x;
                var startY = canvas.height * origin.y;

                while (temp--) {
                    fettis.push(
                        randomPhysics({
                            x: startX,
                            y: startY,
                            angle: angle,
                            spread: spread,
                            startVelocity: startVelocity,
                            color: colors[temp % colors.length],
                            shape: shapes[randomInt(0, shapes.length)],
                            ticks: ticks,
                            decay: decay,
                            gravity: gravity,
                            drift: drift,
                            scalar: scalar
                        })
                    );
                }

                // if we have a previous canvas already animating,
                // add to it
                if (animationObj) {
                    return animationObj.addFettis(fettis);
                }

                animationObj = animate(canvas, fettis, resizer, size, done);

                return animationObj.promise;
            }

            function fire(options) {
                var disableForReducedMotion = globalDisableForReducedMotion || prop(options, 'disableForReducedMotion', Boolean);
                var zIndex = prop(options, 'zIndex', Number);

                if (disableForReducedMotion && preferLessMotion) {
                    return promise(function (resolve) {
                        resolve();
                    });
                }

                if (isLibCanvas && animationObj) {
                    // use existing canvas from in-progress animation
                    canvas = animationObj.canvas;
                } else if (isLibCanvas && !canvas) {
                    // create and initialize a new canvas
                    canvas = getCanvas(zIndex);
                    document.body.appendChild(canvas);
                }

                if (allowResize && !initialized) {
                    // initialize the size of a user-supplied canvas
                    resizer(canvas);
                }

                var size = {
                    width: canvas.width,
                    height: canvas.height
                };

                if (worker && !initialized) {
                    worker.init(canvas);
                }

                initialized = true;

                if (worker) {
                    canvas.__confetti_initialized = true;
                }

                function onResize() {
                    if (worker) {
                        // TODO this really shouldn't be immediate, because it is expensive
                        var obj = {
                            getBoundingClientRect: function () {
                                if (!isLibCanvas) {
                                    return canvas.getBoundingClientRect();
                                }
                            }
                        };

                        resizer(obj);

                        worker.postMessage({
                            resize: {
                                width: obj.width,
                                height: obj.height
                            }
                        });
                        return;
                    }

                    // don't actually query the size here, since this
                    // can execute frequently and rapidly
                    size.width = size.height = null;
                }

                function done() {
                    animationObj = null;

                    if (allowResize) {
                        global.removeEventListener('resize', onResize);
                    }

                    if (isLibCanvas && canvas) {
                        document.body.removeChild(canvas);
                        canvas = null;
                        initialized = false;
                    }
                }

                if (allowResize) {
                    global.addEventListener('resize', onResize, false);
                }

                if (worker) {
                    return worker.fire(options, size, done);
                }

                return fireLocal(options, size, done);
            }

            fire.reset = function () {
                if (worker) {
                    worker.reset();
                }

                if (animationObj) {
                    animationObj.reset();
                }
            };

            return fire;
        }

        module.exports = confettiCannon(null, {
            useWorker: true,
            resize: true
        });
        module.exports.create = confettiCannon;
    }((function () {
        if (typeof window !== 'undefined') {
            return window;
        }

        if (typeof self !== 'undefined') {
            return self;
        }

        return this || {};
    })(), module, false));

    // end source content

    window.confetti = module.exports;
}(window, {}));


let questionBox = document.querySelector('.question-wrapper-center__title');
let about = document.querySelector('.section-2');
let aboutBtn = document.querySelector('#btn-about');
let main = document.querySelector('.section-1');
let ok = document.querySelector('#ok')
let start = document.querySelector('.start')
let questionList = document.querySelector('.section-3')
let variant = document.querySelectorAll('.question-list-wrapper-left');
let answerList = document.querySelectorAll('.question-list-wrapper-right');
let answerListInner = document.querySelectorAll('.question-wrapper-bottom__answer');
let wrapper = document.querySelector('.question-wrapper');
let timeHolder = document.querySelector('#time-holder');
let wrapperBottom = document.querySelector('.question-wrapper-bottom');
let ball = document.querySelector('#ball');
let numSavol = document.querySelector('#numSavol');
let arrowBack = document.querySelector('.arrow-back');
let successCard = document.querySelector('.success-section-card')
let failCard = document.querySelector('.fail-section-card')
let overlay = document.querySelector('.overlay')
let failBtn = document.querySelector('#fail-btn')
let backBtn = document.querySelector('#back-btn');
let congratulationBlock = document.querySelector('.congratulation-block');
let congBtn = document.querySelector('.congratulation-block__btn');
let nexLevelBtn = document.querySelector('#nextLevelBtn');
let thisStep = document.querySelector('#thisBosqich');
let nextStep = document.querySelector('#nextBosqich');
let finalBlock = document.querySelector('.final-block');
let finalBtn = document.querySelector('#final-btn')
let arrowBlock = document.querySelector('#arrow-block')


aboutBtn.addEventListener('click', function() {
    about.classList.add('plus')
    main.classList.add('hidden');

    about.style.transition = 'all ease 0.5s'
} )

ok.addEventListener('click', function() {
    about.classList.remove('plus')
    main.classList.remove('hidden');

    about.style.transition = 'all ease 0s'
})

start.addEventListener('click', function() {
    questionList.classList.add('visible');
    main.classList.add('hidden');
    

    startGame();
    questionFunction();
    
})

arrowBack.addEventListener('click', function() {

    location.reload()

    questionList.style.transition = 'all ease 0s'
})

congBtn.addEventListener('click', function() {
    finalBlock.classList.add('finally');
    failCard.style.display='none'
    overlay.style.display='none';
    wrapper.style.display = 'none';
    congratulationBlock.classList.remove('open');
    arrowBlock.style.display = 'none'
})

function cong() {
    congratulationBlock.classList.add('open');
    wrapper.style.display = 'none';
    failCard.style.display='none'
    overlay.style.display='none';
    arrowBlock.style.display = 'none'
}

finalBtn.addEventListener('click', function() {
    location.reload();
})

// ENDPOINT
const ENDPOINT = 'https://quizzes-server.herokuapp.com'
let allQuizzes;

// all questions
const mainFunc = async () => {

    //------------------ FETCH ALL QUESTIONS ------------------------
    const allQuestions = await fetch(`${ENDPOINT}/questions`)

    allQuizzes = await allQuestions.json()

}

mainFunc()

// ------------------ CHECK THE ANSWER ------------------------

function fail() {
    failCard.classList.add('be-fail')
    overlay.classList.add('fail');
    wrapper.style.display = 'none';
    arrowBlock.style.display = 'none'
}

let startingMinutes =  0.5;

let time = Math.floor(startingMinutes * 60);

function updateCountdown() {
    const minutes = Math.floor(time / 60);
    
    let seconds = time % 60;

    seconds = seconds < 10 ? '0' + seconds : seconds;

    timeHolder.textContent = `${minutes}:${seconds}`;
    time--;

    if (0 > minutes) {
        timeHolder.textContent = '0:00';
        fail()
    }
};
let startingGame;


function startGame() {
    
     startingGame = setInterval(updateCountdown, 1000)

    return startingGame
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function classRemover () {
   let btnsElem = document.querySelectorAll('.question-wrapper-bottom__answer').forEach(item => {
        item.classList.remove('false');
        item.disabled = false
    })  
}


function questionFunction() {
    
    let  balEl = 4;
    ball.innerHTML = balEl
    let arrayLenght = allQuizzes.length
    let rendom = getRandomInt(arrayLenght);
    let elemID = allQuizzes[rendom].id
    

    if(balEl == 0 ) {
        fail();
    }

    questionBox.innerHTML = allQuizzes[rendom].question;
    for(let i = 3; i >= 0; i--) {
        let rendomJavob = getRandomInt(i)
        let btns = document.createElement('button')
        wrapperBottom.appendChild(btns)
        btns.setAttribute('class', 'question-wrapper-bottom__answer');
        btns.innerHTML = allQuizzes[rendom].answers[rendomJavob]
        allQuizzes[rendom].answers.splice(rendomJavob, 1);
        
    }

   

    
    
    let btnsElem = document.querySelectorAll('.question-wrapper-bottom__answer')
    let spiner  = document.querySelector('.spiner')
    
    
    function trueAnswer() {
        btnsElem.forEach(el => {
            el.addEventListener('click', async (evt) => {

                // user send the anwser
                spiner.classList.add('show')
                // stop time reason for fetching true answer
                
            //    let hello = time.textContent
               clearInterval(startingGame);
                
                const result = await fetch(`${ENDPOINT}/answer`, {
                    method: 'post',
                    headers: {
                        'Content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        question_id: elemID,
                        answer: `${el.textContent}`
                    })
                })

                // we get the answer so remove the spinner
                spiner.classList.remove('show')
                startingGame = setInterval(updateCountdown, 1000)
              
                let togri = await result.json()

                
                    if (togri.message == true) {
                        el.disabled = true
                        balEl = Number(ball.textContent) + 2;
                        ball.innerHTML = balEl
                        el.classList.add('true');
                        
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: {
                                y: 0.6
                            }
                        });
                        

                        let y = 3
                        setTimeout(() => {
                            el.disabled = false
                            allQuizzes.splice(rendom, 1);
                            step();
                            time = Math.floor(startingMinutes * 60);
                            numSavol.innerHTML = Number(numSavol.textContent) + 1
                            el.classList.remove('true');
                            classRemover();
                            arrayLenght = arrayLenght - 1;
                            rendom = getRandomInt(arrayLenght);
                            elemID = allQuizzes[rendom].id
                            questionBox.innerHTML = allQuizzes[rendom].question;
                            btnsElem.forEach(item => {

                                rendomJavob = getRandomInt(y)
                                item.innerHTML = allQuizzes[rendom].answers[rendomJavob]
                                allQuizzes[rendom].answers.splice(rendomJavob, 1);
                                y = y - 1;



                            })
                        }, 500);




                    } else {
                        el.classList.add('false');
                        wrapper.classList.add('active');
                        
                        el.disabled = true
                        balEl = Number(ball.textContent) - 2;
                        ball.innerHTML = balEl
                        if (balEl <= 0) {
                            fail()
                        }
                        setTimeout(() => {
                            wrapper.classList.remove('active');
                        }, 500);
                    }
                



            })
        })
    }

    trueAnswer()

    



    
    

    function stiping () {
        overlay.classList.add('success')
        successCard.classList.add('be-success')
        wrapper.style.display = 'none'
        arrowBlock.style.display = 'none'
        overlay.classList.remove('fail')
        wrapper.style.display = 'none';
        nexLevelBtn.addEventListener('click', function () {
            time = Math.floor(startingMinutes * 60);
            overlay.classList.remove('success')
            successCard.classList.remove('be-success')
            wrapper.style.display = 'block'
            arrowBlock.style.display = 'flex'
            overlay.classList.remove('fail')
            failCard.classList.remove('be-fail')
        })
    }

    function step() {
        if (allQuizzes.length <= 0) {
        
            cong()
            var end = Date.now() + (15 * 1000);

            // go Buckeyes!
            var colors = ['#bb0000', '#ffffff'];

            (function frame() {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: {
                        x: 0
                    },
                    colors: colors
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: {
                        x: 1
                    },
                    colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
            
            



        } else if (allQuizzes.length == 21) {
            thisStep.innerHTML = 2;
            nextStep.innerHTML = 3;
            stiping()
            
        } else if (allQuizzes.length == 41) {
            
            thisStep.textContent = 1;
            nextStep.textContent = 2;
            stiping()
            
            
        }else {
            
        }
        
    }

    
    
}
failBtn.addEventListener('click', function() {
    location.reload();
})

backBtn.addEventListener('click', function() {
    location.reload();
})

