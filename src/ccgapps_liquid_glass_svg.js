/**
 * Liquid Glass Effect Library
 * Supported features:
 * - data-disp-map="url": Use custom image source for displacement.
 * - Procedural Generation: Smart padding strategy to prevent edge artifacts.
 * - Strict Pixel Mode: all dimensions mapped 1:1 to screen pixels.
 */

const SurfaceFns = {
    CONVEX_CIRCLE: (x) => Math.sqrt(1 - (1 - x) ** 2),
    CONVEX: (x) => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4),
    SQUIRCLE: (x) => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4),
    CONCAVE: (x) => 1 - Math.sqrt(1 - (1 - x) ** 2),
    LIP: (x) => {
        const convex = Math.pow(1 - Math.pow(1 - x * 2, 4), 1 / 4);
        const concave = (1 - Math.sqrt(1 - (1 - x) ** 2)) + 0.1;
        const smootherstep = 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
        return convex * (1 - smootherstep) + concave * smootherstep;
    },
    WAVE: (x) => {
        const base = Math.pow(x, 0.5);
        const wave = Math.sin(x * Math.PI * 3) * 0.1;
        return Math.max(0, Math.min(1, base + wave));
    },
    STEPPED: (x) => {
        const steps = 4;
        const stepSize = 1 / steps;
        const stepIndex = Math.floor(x / stepSize);
        const stepProgress = (x % stepSize) / stepSize;
        const stepHeight = stepIndex / (steps - 1);
        const smoothing = Math.pow(stepProgress, 3) * (stepProgress * (stepProgress * 6 - 15) + 10);
        return stepHeight + smoothing * (1 / (steps - 1));
    },
    ELASTIC: (x) => {
        if (x === 0) return 0;
        if (x === 1) return 1;
        const p = 0.3;
        const s = p / 4;
        return Math.pow(2, -10 * x) * Math.sin(((x - s) * (2 * Math.PI)) / p) + 1;
    },
    BUBBLE: (x) => {
        const center = 0.6;
        const width = 0.4;
        const height = 1.2;
        const distance = Math.abs(x - center) / width;
        if (distance > 1) return 0;
        const bubble = Math.sqrt(1 - distance * distance) * height;
        const base = Math.pow(x, 2);
        return Math.max(0, Math.min(1, Math.max(base, bubble)));
    }
};

function calculateRefractionProfile(glassThickness, bezelWidth, bezelHeightFn, refractiveIndex, samples = 128) {
    const eta = 1 / refractiveIndex;

    function refract(normalX, normalY) {
        const dot = normalY;
        const k = 1 - eta * eta * (1 - dot * dot);
        if (k < 0) return null; 
        const kSqrt = Math.sqrt(k);
        return [-(eta * dot + kSqrt) * normalX, eta - (eta * dot + kSqrt) * normalY];
    }

    return Array.from({ length: samples }, (_, i) => {
        const x = i / samples;
        const y = bezelHeightFn(x);
        const dx = x < 1 ? 0.0001 : -0.0001;
        const y2 = bezelHeightFn(x + dx);
        const derivative = (y2 - y) / dx;
        const magnitude = Math.sqrt(derivative * derivative + 1);
        const normal = [-derivative / magnitude, -1 / magnitude];
        const refracted = refract(normal[0], normal[1]);

        if (!refracted) return 0;
        const remainingHeightOnBezel = y * bezelWidth;
        const remainingHeight = remainingHeightOnBezel + glassThickness;
        return refracted[0] * (remainingHeight / refracted[1]);
    });
}

// LRU Cache for generated displacement and specular maps (limits performance bottlenecks)
const mapDataCache = new Map();
function getCachedMapData(key, generationFn) {
    if (mapDataCache.has(key)) {
        return mapDataCache.get(key);
    }
    const dataUrl = generationFn();
    mapDataCache.set(key, dataUrl);
    // Keep cache size bounded (approx 30 maps to prevent unbounded memory growth with base64 strings)
    if (mapDataCache.size > 30) {
        const firstKey = mapDataCache.keys().next().value;
        mapDataCache.delete(firstKey);
    }
    return dataUrl;
}

function generateDisplacementImageData(objectWidth, objectHeight, radius, bezelWidth, maxDisplacement, refractionProfile, padding, dpr = 1) {
    // Optimization: Cap resolution to 256px for performance. 
    // Displacement maps are smooth and don't need high resolution.
    const maxRes = 256;
    const scaleFactor = Math.min(1, maxRes / Math.max(objectWidth * dpr, objectHeight * dpr));
    
    const fullWidth = Math.ceil((objectWidth + padding * 2) * dpr * scaleFactor);
    const fullHeight = Math.ceil((objectHeight + padding * 2) * dpr * scaleFactor);
    const objectWidth_ = objectWidth * dpr * scaleFactor;
    const objectHeight_ = objectHeight * dpr * scaleFactor;
    const padding_ = padding * dpr * scaleFactor;
    const radius_ = radius * dpr * scaleFactor;
    
    const canvas = document.createElement('canvas');
    canvas.width = fullWidth;
    canvas.height = fullHeight;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(fullWidth, fullHeight);
    const data = imageData.data;

    // Fill neutral (128, 128, 0, 255) in chunks for speed
    const neutralPixel = [128, 128, 0, 255];
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 128; data[i + 1] = 128; data[i + 2] = 0; data[i + 3] = 255;
    }

    const bezel = bezelWidth * dpr * scaleFactor;
    const radiusSquared = radius_ ** 2;
    const radiusPlusOneSquared = (radius_ + 1) ** 2;
    const radiusMinusBezelSquared = (radius_ - bezel) ** 2;
    const widthBetweenRadiuses = objectWidth_ - radius_ * 2;
    const heightBetweenRadiuses = objectHeight_ - radius_ * 2;
    
    const startX = padding_;
    const startY = padding_;

    // Performance: Avoid Math.sqrt if possible, and floor once
    for (let y1 = 0; y1 < objectHeight_; y1++) {
        const rowOffset = Math.floor(startY + y1) * fullWidth;
        const isOnTopSide = y1 < radius_;
        const isOnBottomSide = y1 >= objectHeight_ - radius_;
        const yCoord = isOnTopSide ? y1 - radius_ : isOnBottomSide ? y1 - radius_ - heightBetweenRadiuses : 0;
        const ySq = yCoord * yCoord;

        for (let x1 = 0; x1 < objectWidth_; x1++) {
            const idx = (rowOffset + Math.floor(startX + x1)) * 4;
            if(idx < 0 || idx >= data.length) continue;

            const isOnLeftSide = x1 < radius_;
            const isOnRightSide = x1 >= objectWidth_ - radius_;
            const xCoord = isOnLeftSide ? x1 - radius_ : isOnRightSide ? x1 - radius_ - widthBetweenRadiuses : 0;

            const distanceToCenterSquared = xCoord * xCoord + ySq;
            if (distanceToCenterSquared <= radiusPlusOneSquared && distanceToCenterSquared >= radiusMinusBezelSquared) {
                const distanceFromCenter = Math.sqrt(distanceToCenterSquared);
                const opacity = distanceToCenterSquared < radiusSquared ? 1 : 1 - (distanceFromCenter - radius_) / (Math.sqrt(radiusPlusOneSquared) - radius_);
                const distanceFromSide = radius_ - distanceFromCenter;
                const cos = xCoord / (distanceFromCenter || 1);
                const sin = yCoord / (distanceFromCenter || 1);
                const bezelIndex = Math.floor((distanceFromSide / (bezel || 1)) * refractionProfile.length);
                const distance = refractionProfile[Math.min(bezelIndex, refractionProfile.length - 1)] || 0;
                
                // Normalizing to dpr/scaleFactor to keep strength consistent
                const dX = (-cos * distance) / (maxDisplacement || 1);
                const dY = (-sin * distance) / (maxDisplacement || 1);

                data[idx] = 128 + dX * 127 * opacity;
                data[idx + 1] = 128 + dY * 127 * opacity;
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

function generateSpecularImageData(objectWidth, objectHeight, radius, angleDeg, opacity, padding, dpr = 1) {
    const fullWidth = Math.round((objectWidth + padding * 2) * dpr);
    const fullHeight = Math.round((objectHeight + padding * 2) * dpr);
    const objectWidth_ = Math.round(objectWidth * dpr);
    const objectHeight_ = Math.round(objectHeight * dpr);
    const padding_ = Math.round(padding * dpr);
    const radius_ = Math.round(radius * dpr);
    
    // Original y(e) logic constants
    const angleRad = (angleDeg * Math.PI) / 180;
    const specularAngle = angleRad;
    const o_spec = [Math.cos(specularAngle), Math.sin(specularAngle)];
    const v_const = 20; // Original specular map border distance constant

    const canvas = document.createElement('canvas');
    canvas.width = fullWidth;
    canvas.height = fullHeight;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(fullWidth, fullHeight);
    const data = imageData.data;

    // fillColor: 0
    for(let i=0; i<data.length; i+=4) {
        data[i] = 0; data[i+1] = 0; data[i+2] = 0; data[i+3] = 0;
    }

    const s_radius = Math.min(radius_, objectWidth_ / 2, objectHeight_ / 2);
    const c_width = objectWidth_ - s_radius * 2;
    const l_height = objectHeight_ - s_radius * 2;
    const u_radiusSq = s_radius ** 2;
    const d_outerRadiusSq = (s_radius + 1) ** 2;
    const maxDistToBorder = v_const * dpr;
    const f_innerRadiusSq = Math.pow(Math.max(0, s_radius - maxDistToBorder), 2);
    
    const startX = padding_;
    const startY = padding_;

    for (let y1 = 0; y1 < objectHeight_; y1++) {
        for (let x1 = 0; x1 < objectWidth_; x1++) {
            const idx = ((startY + y1) * fullWidth + (startX + x1)) * 4;
            if(idx < 0 || idx >= data.length) continue;

            // p(e) coordinate projection logic
            const isLeft = x1 < s_radius;
            const isRight = x1 >= objectWidth_ - s_radius;
            const isTop = y1 < s_radius;
            const isBottom = y1 >= objectHeight_ - s_radius;

            const rx = isLeft ? x1 - s_radius : (isRight ? x1 - s_radius - c_width : 0);
            const ry = isTop ? y1 - s_radius : (isBottom ? y1 - s_radius - l_height : 0);
            const distSq = rx * rx + ry * ry;

            if (distSq <= d_outerRadiusSq && distSq >= f_innerRadiusSq) {
                const dist = Math.sqrt(distSq);
                const distToBorder = s_radius - dist;
                const normalizedDist = distToBorder / s_radius;
                const angle = Math.atan2(ry, rx);
                const edgeFalloff = distSq > u_radiusSq ? 1 - distToBorder : 1;

                // Original y(e) math
                // Original y(e) math
                const f_val = distToBorder;
                const p_val = rx / (dist || 1);
                const m_val = -ry / (dist || 1);
                
                // h = Math.abs(p * o[0] + m * o[1]) * Math.sqrt(1 - (1 - f / (1 * t)) ** 2)
                const intensity_h = Math.abs(p_val * o_spec[0] + m_val * o_spec[1]) * Math.sqrt(1 - Math.pow(1 - f_val / (1 * dpr), 2));
                const g_color = 255 * intensity_h;
                const alpha = g_color * intensity_h * edgeFalloff;

                // Handle NaN explicitly for safety, though Uint8ClampedArray maps NaN to 0
                data[idx] = isNaN(g_color) ? 0 : g_color;
                data[idx + 1] = isNaN(g_color) ? 0 : g_color;
                data[idx + 2] = isNaN(g_color) ? 0 : g_color;
                data[idx + 3] = isNaN(alpha) ? 0 : alpha;
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

class LiquidGlassManager {
    constructor() {
        this.svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgContainer.id = 'liquid-glass-filters';
        this.svgContainer.style.position = 'absolute';
        this.svgContainer.style.width = '0';
        this.svgContainer.style.height = '0';
        this.svgContainer.style.pointerEvents = 'none';
        this.svgContainer.style.overflow = 'hidden';
        this.svgContainer.style.zIndex = '-9999';
        
        if (document.body) {
            document.body.appendChild(this.svgContainer);
        } else {
            window.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(this.svgContainer);
            });
        }

        this.instances = new Map();
        this.init();
        
        let observerTimeout;
        this.observer = new MutationObserver((mutations) => {
            if (observerTimeout) clearTimeout(observerTimeout);
            observerTimeout = setTimeout(() => {
                mutations.forEach(m => {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.hasAttribute('data-liquid-glass')) this.add(node);
                            if (node.querySelectorAll) node.querySelectorAll('[data-liquid-glass]').forEach(el => this.add(el));
                        }
                    });
                });
            }, 500); // 500ms debounce for DOM changes
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    init() {
        document.querySelectorAll('[data-liquid-glass]').forEach(el => this.add(el));
    }

    add(el) {
        if (this.instances.has(el)) return;
        this.instances.set(el, new LiquidGlassInstance(el, this));
    }
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        this.instances.forEach(instance => {
            if (instance.filterEl) instance.filterEl.remove();
        });
        this.instances.clear();

        if (this.svgContainer) {
            this.svgContainer.remove();
            this.svgContainer = null;
        }
        
        window.LiquidGlass = null;
    }
}

const Defaults = { 
    thickness: 155, 
    bezel: 30, 
    index: 1.5, 
    blur: 0, 
    magnification: 1, 
    scale: 20, 
    rgbglitch: 0,
    brightness: 1,
    contrast: 1,
    grayscale: 0,
    "hue-rotate": 0,
    invert: 0,
    opacity: 1,
    saturate: 1,
    sepia: 0,
    specularOpacity: 0.2,
    specularAngle: 45
};

// Expose Defaults globally so they can be overridden before load
// Merge with existing config if present
window.LiquidGlassConfig = { 
    ...Defaults, 
    ...(window.LiquidGlassConfig || {}) 
};

// Expose Utils for manual map generation
window.LiquidGlassUtils = {
    generateMap: generateDisplacementImageData,
    calculateProfile: calculateRefractionProfile,
    SurfaceFns: SurfaceFns
};

class LiquidGlassInstance {
    constructor(element, manager) {
        this.el = element;
        this.manager = manager;
        this.id = 'liquid-' + Math.random().toString(36).substr(2, 9);
        this.config = { ...window.LiquidGlassConfig };
        this.profile = 'CONVEX';

        this.initStructure();
        this.initSVG();
        this.parseAttributes();
        this.setupObservers();
        
        this.isInitializing = true;
        requestAnimationFrame(() => {
            this.updatePhysics(() => {
                this.isInitializing = false;
                this.applyEffects();
                setTimeout(() => this.applyEffects(), 100);
            });
        });
    }

    initStructure() {
        const style = window.getComputedStyle(this.el);
        if (style.position === 'static') {
            this.el.style.position = 'relative'; 
        }

        // Create specular overlay
        this.specularEl = document.createElement('div');
        this.specularEl.className = 'liquid-glass-specular';
        Object.assign(this.specularEl.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '1000',
            mixBlendMode: 'overlay',
            borderRadius: 'inherit'
        });
        this.el.appendChild(this.specularEl);
    }

    initSVG(forceRebuild = false) {
        if (this.filterEl && !forceRebuild) return;
        if (this.filterEl) {
            this.filterEl.remove();
            if (this.specularFilterEl) this.specularFilterEl.remove();
        }

        const ns = "http://www.w3.org/2000/svg";
        const defs = document.createElementNS(ns, "defs");
        
        // 1. Refraction Filter (for backdrop-filter)
        const refrFilter = document.createElementNS(ns, "filter");
        refrFilter.setAttribute("id", this.id + "_refr");
        refrFilter.setAttribute("filterUnits", "userSpaceOnUse");
        refrFilter.setAttribute("x", "0");
        refrFilter.setAttribute("y", "0");
        refrFilter.setAttribute("width", "100");
        refrFilter.setAttribute("height", "100");
        refrFilter.setAttribute("color-interpolation-filters", "sRGB");

        const dispResultId = this.id + "_disp";
        this.feImage = document.createElementNS(ns, "feImage");
        this.feImage.setAttribute("result", dispResultId);
        this.feImage.setAttribute("preserveAspectRatio", "none");
        this.feImage.setAttribute("x", "0");
        this.feImage.setAttribute("y", "0");
        refrFilter.appendChild(this.feImage);

        // 2. Specular Filter (for regular filter overlay)
        const specFilter = document.createElementNS(ns, "filter");
        specFilter.setAttribute("id", this.id + "_spec");
        specFilter.setAttribute("filterUnits", "userSpaceOnUse");
        specFilter.setAttribute("x", "0");
        specFilter.setAttribute("y", "0");
        specFilter.setAttribute("width", "100");
        specFilter.setAttribute("height", "100");
        specFilter.setAttribute("color-interpolation-filters", "sRGB");

        const specMapId = this.id + "_specMap";
        this.feSpecularImage = document.createElementNS(ns, "feImage");
        this.feSpecularImage.setAttribute("result", specMapId);
        this.feSpecularImage.setAttribute("preserveAspectRatio", "none");
        this.feSpecularImage.setAttribute("x", "0");
        this.feSpecularImage.setAttribute("y", "0");
        specFilter.appendChild(this.feSpecularImage);

        const specAlphaId = this.id + "_specAlpha";
        const feColorMatrix = document.createElementNS(ns, "feColorMatrix");
        feColorMatrix.setAttribute("in", specMapId);
        feColorMatrix.setAttribute("type", "luminanceToAlpha");
        feColorMatrix.setAttribute("result", specAlphaId);
        specFilter.appendChild(feColorMatrix);

        const specOpacityId = this.id + "_specOpacity";
        const feComponentTransfer = document.createElementNS(ns, "feComponentTransfer");
        feComponentTransfer.setAttribute("in", specAlphaId);
        feComponentTransfer.setAttribute("result", specOpacityId);
        const feFuncA = document.createElementNS(ns, "feFuncA");
        feFuncA.setAttribute("type", "linear");
        feFuncA.setAttribute("slope", this.config.specularOpacity.toString());
        feComponentTransfer.appendChild(feFuncA);
        specFilter.appendChild(feComponentTransfer);

        const whiteFloodId = this.id + "_whiteFlood";
        const feFlood = document.createElementNS(ns, "feFlood");
        feFlood.setAttribute("flood-color", "white");
        feFlood.setAttribute("result", whiteFloodId);
        specFilter.appendChild(feFlood);

        const maskedSpecId = this.id + "_maskedSpec";
        const feCompositeMask = document.createElementNS(ns, "feComposite");
        feCompositeMask.setAttribute("in", whiteFloodId);
        feCompositeMask.setAttribute("in2", specOpacityId);
        feCompositeMask.setAttribute("operator", "in");
        feCompositeMask.setAttribute("result", maskedSpecId);
        specFilter.appendChild(feCompositeMask);

        const feFinalSpecComposite = document.createElementNS(ns, "feComposite");
        feFinalSpecComposite.setAttribute("in", maskedSpecId);
        feFinalSpecComposite.setAttribute("in2", "SourceGraphic");
        feFinalSpecComposite.setAttribute("operator", "over");
        specFilter.appendChild(feFinalSpecComposite);

        // Check Glitch Mode
        this.isGlitchMode = (this.config.rgbglitch && this.config.rgbglitch > 0);

        if (this.isGlitchMode) {
            this.feDisplacementMapR = document.createElementNS(ns, "feDisplacementMap");
            this.feDisplacementMapR.setAttribute("in", "SourceGraphic");
            this.feDisplacementMapR.setAttribute("in2", dispResultId);
            this.feDisplacementMapR.setAttribute("xChannelSelector", "R");
            this.feDisplacementMapR.setAttribute("yChannelSelector", "G");
            this.feDisplacementMapR.setAttribute("result", "dispR");

            this.feDisplacementMapG = document.createElementNS(ns, "feDisplacementMap");
            this.feDisplacementMapG.setAttribute("in", "SourceGraphic");
            this.feDisplacementMapG.setAttribute("in2", dispResultId);
            this.feDisplacementMapG.setAttribute("xChannelSelector", "R");
            this.feDisplacementMapG.setAttribute("yChannelSelector", "G");
            this.feDisplacementMapG.setAttribute("result", "dispG");

            this.feDisplacementMapB = document.createElementNS(ns, "feDisplacementMap");
            this.feDisplacementMapB.setAttribute("in", "SourceGraphic");
            this.feDisplacementMapB.setAttribute("in2", dispResultId);
            this.feDisplacementMapB.setAttribute("xChannelSelector", "R");
            this.feDisplacementMapB.setAttribute("yChannelSelector", "G");
            this.feDisplacementMapB.setAttribute("result", "dispB");

            const feColorR = document.createElementNS(ns, "feColorMatrix");
            feColorR.setAttribute("in", "dispR");
            feColorR.setAttribute("type", "matrix");
            feColorR.setAttribute("values", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0");
            feColorR.setAttribute("result", "R");

            const feColorG = document.createElementNS(ns, "feColorMatrix");
            feColorG.setAttribute("in", "dispG");
            feColorG.setAttribute("type", "matrix");
            feColorG.setAttribute("values", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0");
            feColorG.setAttribute("result", "G");

            const feColorB = document.createElementNS(ns, "feColorMatrix");
            feColorB.setAttribute("in", "dispB");
            feColorB.setAttribute("type", "matrix");
            feColorB.setAttribute("values", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0");
            feColorB.setAttribute("result", "B");

            const feBlendRG = document.createElementNS(ns, "feBlend");
            feBlendRG.setAttribute("in", "R");
            feBlendRG.setAttribute("in2", "G");
            feBlendRG.setAttribute("mode", "screen");
            feBlendRG.setAttribute("result", "RG");

            const feBlendRGB = document.createElementNS(ns, "feBlend");
            feBlendRGB.setAttribute("in", "RG");
            feBlendRGB.setAttribute("in2", "B");
            feBlendRGB.setAttribute("mode", "screen");

            refrFilter.appendChild(this.feDisplacementMapR);
            refrFilter.appendChild(this.feDisplacementMapG);
            refrFilter.appendChild(this.feDisplacementMapB);
            refrFilter.appendChild(feColorR);
            refrFilter.appendChild(feColorG);
            refrFilter.appendChild(feColorB);
            refrFilter.appendChild(feBlendRG);
            refrFilter.appendChild(feBlendRGB);

        } else {
            this.feDisplacementMap = document.createElementNS(ns, "feDisplacementMap");
            this.feDisplacementMap.setAttribute("in", "SourceGraphic");
            this.feDisplacementMap.setAttribute("in2", dispResultId);
            this.feDisplacementMap.setAttribute("xChannelSelector", "R");
            this.feDisplacementMap.setAttribute("yChannelSelector", "G");
            this.feDisplacementMap.setAttribute("scale", "20");
            refrFilter.appendChild(this.feDisplacementMap);
        }

        defs.appendChild(refrFilter);
        defs.appendChild(specFilter);
        
        this.manager.svgContainer.appendChild(defs);
        this.filterEl = refrFilter;
        this.specularFilterEl = specFilter;
    }

    parseAttributes() {
        // Reset defaults first to ensure clean state
        this.config = { ...window.LiquidGlassConfig };
        this.hasSpecular = false;
        
        // Parse Custom Map URL
        this.mapUrl = this.el.getAttribute('data-disp-map');
        console.log(`[LiquidGlass] parseAttributes for ${this.el.className}: mapUrl='${this.mapUrl}'`);

        const profileAttr = this.el.getAttribute('data-liquid-profile');
        if (profileAttr) {
            const key = profileAttr.toUpperCase().replace('-', '_');
            if (SurfaceFns[key]) this.profile = key;
        }

        const configAttr = this.el.getAttribute('data-liquid-config');
        if (configAttr) {
            configAttr.split(' ').forEach(pair => {
                // Check specifically for light-angle shorthand
                if (pair.startsWith('light-angle-')) {
                    const angle = parseFloat(pair.replace('light-angle-', ''));
                    if (!isNaN(angle)) {
                        this.config.specularAngle = angle;
                        this.hasSpecular = true;
                    }
                    return;
                }
                
                const lastHyphen = pair.lastIndexOf('-');
                if (lastHyphen !== -1) {
                    const key = pair.substring(0, lastHyphen);
                    const valStr = pair.substring(lastHyphen + 1);
                    const val = parseFloat(valStr);
                    if (!isNaN(val) && key in this.config) {
                        this.config[key] = val;
                    }
                }
            });
        }
    }


    setupObservers() {
        let resizeRaf;
        new ResizeObserver(() => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => this.update());
        }).observe(this.el);
        new MutationObserver((mutations) => {
            let needsUpdate = false;
            mutations.forEach(m => {
                if (m.type === 'attributes' && (
                    m.attributeName === 'data-liquid-config' || 
                    m.attributeName === 'data-liquid-profile' || 
                    m.attributeName === 'data-disp-map' ||
                    m.attributeName === 'style' ||
                    m.attributeName === 'class'
                )) {
                    needsUpdate = true;
                }
            });
            if (needsUpdate) {
                this.parseAttributes();
                this.update();
            }
        }).observe(this.el, { attributes: true });
    }

    update() {
        this.updatePhysics(() => {
            this.applyEffects();
        });
    }

    updatePhysics(onReady) {
        const width = this.el.offsetWidth;
        const height = this.el.offsetHeight;
        
        if (width === 0 || height === 0) return;

        // Check if mode needs update
        const shouldBeGlitch = (this.config.rgbglitch && this.config.rgbglitch > 0);
        if (shouldBeGlitch !== this.isGlitchMode) {
            this.initSVG(true); // Rebuild filter
        }

        // Safety Padding
        const pad = 50; 

        // 1. Expand Filter Region (Always expand to prevent clipping)
        this.filterEl.setAttribute("x", -pad);
        this.filterEl.setAttribute("y", -pad);
        this.filterEl.setAttribute("width", width + pad * 2);
        this.filterEl.setAttribute("height", height + pad * 2);

        this.specularFilterEl.setAttribute("x", -pad);
        this.specularFilterEl.setAttribute("y", -pad);
        this.specularFilterEl.setAttribute("width", width + pad * 2);
        this.specularFilterEl.setAttribute("height", height + pad * 2);

        // --- Check for Custom Displacement Map ---
        // Always read attribute directly to support dynamic changes and avoid sync issues
        const customMapUrl = this.el.getAttribute('data-disp-map');
        console.log(`[LiquidGlass] updatePhysics for ${this.el.className || this.el.tagName}: customMapUrl='${customMapUrl}'`);
        
        const mag = this.config.magnification || 1;

        const applyScale = (scaleValue) => {
            const glitch = this.config.rgbglitch || 0;
            if (this.isGlitchMode) {
                this.feDisplacementMapR.setAttribute("scale", scaleValue + glitch);
                this.feDisplacementMapG.setAttribute("scale", scaleValue);
                this.feDisplacementMapB.setAttribute("scale", scaleValue - glitch);
            } else {
                this.feDisplacementMap.setAttribute("scale", scaleValue);
            }
        };

        if (customMapUrl) {
            // === Custom Map Mode ===
            const w = width * mag;
            const h = height * mag;
            
            this.feImage.setAttribute("x", (width - w) / 2);
            this.feImage.setAttribute("y", (height - h) / 2);
            this.feImage.setAttribute("width", w);
            this.feImage.setAttribute("height", h);
            this.feImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", customMapUrl);
            this.feImage.setAttribute("href", customMapUrl);

            // For custom map, we still might want specular? 
            // But usually custom map implies external control. 
            // Let's at least clear specular image or set it to empty if using custom map
            // to avoid ghost specular from previous procedural mode.
            this.feSpecularImage.setAttribute("href", "");
            
            applyScale(this.config.scale);

            if (onReady) onReady();
        } else {
            // === Procedural Mode (Default) ===
            const radius = parseFloat(window.getComputedStyle(this.el).borderRadius) || 0;
            
            // Calculate base dimensions (with padding) and then apply magnification
            const baseW = width + pad * 2;
            const baseH = height + pad * 2;
            const w = baseW * mag;
            const h = baseH * mag;

            this.feImage.setAttribute("x", (width - w) / 2);
            this.feImage.setAttribute("y", (height - h) / 2);
            this.feImage.setAttribute("width", w);
            this.feImage.setAttribute("height", h);

            this.feSpecularImage.setAttribute("x", (width - w) / 2);
            this.feSpecularImage.setAttribute("y", (height - h) / 2);
            this.feSpecularImage.setAttribute("width", w);
            this.feSpecularImage.setAttribute("height", h);

            const profileFn = SurfaceFns[this.profile] || SurfaceFns.CONVEX;
            const refractionProfile = calculateRefractionProfile(this.config.thickness, this.config.bezel, profileFn, this.config.index);
            const maxDisplacement = Math.max(...refractionProfile.map(Math.abs));
            
            const specDpr = 4; // High-quality scalar for specular smooth reflection
            const dispDpr = 1; // 1x scalar for displacement (massively speeds up Base64 and SVG processing)
            
            const dispKey = `disp_${width}_${height}_${radius}_${this.config.bezel}_${this.config.thickness}_${this.profile}_${this.config.index}_${dispDpr}_${pad}`;
            const dispDataUrl = getCachedMapData(dispKey, () => generateDisplacementImageData(width, height, radius, this.config.bezel, maxDisplacement, refractionProfile, pad, dispDpr));
            
            let specDataUrl = '';
            if (this.hasSpecular) {
                const specKey = `spec_${width}_${height}_${radius}_${this.config.specularAngle}_${specDpr}_${pad}`;
                specDataUrl = getCachedMapData(specKey, () => generateSpecularImageData(width, height, radius, this.config.specularAngle, this.config.specularOpacity, pad, specDpr));
                this.specularEl.style.display = 'block';
            } else {
                this.specularEl.style.display = 'none';
            }

            const img = new Image();
            img.onload = () => {
                this.feImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", dispDataUrl);
                this.feImage.setAttribute("href", dispDataUrl);

                if (this.hasSpecular) {
                    this.feSpecularImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", specDataUrl);
                    this.feSpecularImage.setAttribute("href", specDataUrl);
                }
                
                // Logic: If user specifically set 'scale' (!= 20 default), use it.
                // Otherwise, let physics (thickness/index) determine the scale entirely.
                let finalScale = maxDisplacement;
                if (this.config.scale !== 20) {
                     finalScale = this.config.scale;
                }
                
                applyScale(finalScale);
                if (onReady) onReady();
            };
            img.onerror = () => {
                this.feImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", dispDataUrl);
                this.feImage.setAttribute("href", dispDataUrl);
                if (this.hasSpecular) {
                    this.feSpecularImage.setAttributeNS("http://www.w3.org/1999/xlink", "href", specDataUrl);
                    this.feSpecularImage.setAttribute("href", specDataUrl);
                }
                if (onReady) onReady();
            };
            img.src = dispDataUrl;
        }
    }

    applyEffects() {
        const filters = [];

        // 1. Standard CSS Backdrop Filters
        if (this.config.blur > 0) filters.push(`blur(${this.config.blur}px)`);
        if (this.config.brightness !== 1) filters.push(`brightness(${this.config.brightness})`);
        if (this.config.contrast !== 1) filters.push(`contrast(${this.config.contrast})`);
        if (this.config.grayscale > 0) filters.push(`grayscale(${this.config.grayscale})`);
        if (this.config["hue-rotate"] !== 0) filters.push(`hue-rotate(${this.config["hue-rotate"]}deg)`);
        if (this.config.invert > 0) filters.push(`invert(${this.config.invert})`);
        if (this.config.opacity !== 1) filters.push(`opacity(${this.config.opacity})`);
        if (this.config.saturate !== 1) filters.push(`saturate(${this.config.saturate})`);
        if (this.config.sepia > 0) filters.push(`sepia(${this.config.sepia})`);

        // 2. Liquid Glass Displacement Filter (SVG)
        // IMPORTANT: Always push this last to ensure it sits on top of other filters (like blur)
        filters.push(`url(#${this.id}_refr)`);

        const combinedFilter = filters.join(' ');
        
        this.el.style.backdropFilter = combinedFilter;
        this.el.style.webkitBackdropFilter = combinedFilter;

        // 3. Specular Overlay Filter (on dedicated overlay)
        // This ensures the specular is ABOVE all other content in the element
        this.specularEl.style.filter = `url(#${this.id}_spec)`;
        
        // Remove filter from main element if it was there
        this.el.style.filter = '';
    }
}



function initLiquidGlass() {
    // Check local storage for settings disable
    try {
        const saved = localStorage.getItem('ccs_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (settings.appearance && settings.appearance.liquidGlass === false) {
                return; // Do not initialize if disabled
            }
        }
    } catch (e) {
        console.error('Error checking liquid glass settings:', e);
    }

    if (document.body) window.LiquidGlass = new LiquidGlassManager();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiquidGlass);
} else {
    initLiquidGlass();
}