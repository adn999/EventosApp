import { animation, style, animate, trigger, transition, useAnimation } from '@angular/animations';

export const transitionAnimation = animation([
  style({
    height: '{{ height }}',
    opacity: '{{ opacity }}',
    backgroundColor: '{{ backgroundColor }}'
  }),
  animate('{{ time }}')
]);


export const transitionEntrada= animation([
    style({ opacity: 0, transform: "translateX(-100%)" }), //apply default styles before animation starts
             animate( "350ms ease-in-out", style({ opacity: 1, transform: "translateX(0)" }))   
]);

export const transitionSalida= animation([
    style({ opacity: 0, transform: "translateX(100%)" }), //apply default styles before animation starts
        animate("600ms ease-in-out", style({ opacity: 1, transform: "translateX(0)" }))  
]);


export const transitionCollapse= animation([
    style({ width: 0, opacity:0 }), //apply default styles before animation starts
        animate("1000ms ease-out", style({ width:'*', opacity:1}))  
]);

export const transitionCollapseFast= animation([
  style({ width: 0, opacity:0 }), //apply default styles before animation starts
      animate("500ms ease-out", style({ width:'*', opacity:1}))  
]);

export const transitionImg= animation([
    style({ width:0, opacity:0, transform:"translateY(150%)" }), //apply default styles before animation starts
        animate("3000ms ease-in-out", style({ width:'*', opacity:1,  transform:"translateY(0)"   }))  
]);


export const transitionRotateLeft= animation([
  style({ opacity:0 }), //apply default styles before animation starts
      animate("1800ms ease-in-out", style({  opacity:1 }))  
]);

export const transitionRotateRight= animation([
  style({  transform:"rotate(-90deg)" }), //apply default styles before animation starts
      animate("1800ms ease-in-out", style({   transform:"rotate(20deg)" }))  
]);

export const transitionZoom= animation([
  style({ color:'rgb(88,87,88)' }), //apply default styles before animation starts
      animate("4000ms ease-in-out", style({   color: 'rgb(88, 87, 88)'}))  
]);