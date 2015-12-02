import {
  Component, Directive, View, EventEmitter, Host,
  OnInit, Self, NgIf,
  CORE_DIRECTIVES, NgClass, FORM_DIRECTIVES
} from 'angular2/angular2';
import {HTTP_PROVIDERS, Http, Headers} from 'angular2/http';
import {RouteConfig, RouterLink, Router, ROUTER_DIRECTIVES} from 'angular2/router'

import {DATA_LOCATION_URL} from '../config';

@Component({
  selector: 'home',
  providers: [HTTP_PROVIDERS]
})
@View({
  directives: [RouterLink, NgClass, NgIf, CORE_DIRECTIVES, FORM_DIRECTIVES, ROUTER_DIRECTIVES],
  template: `
<div>
  <div class="centered">
      <a class="btn btn-primary pull-right" role="button" (click)="routeLogout()">Logout</a>
  </div>
</div>
`
})
export class Home implements OnInit {
  private jwt:string;
  private decodedJwt:string;

  constructor(public router:Router, public http:Http) {
    this.jwt = localStorage.getItem('jwt');
    this.decodedJwt = this.jwt && window.jwt_decode(this.jwt);
  }

  onInit() {
  }

  routeLogout() {
    localStorage.removeItem('jwt');
    window.location.href = '/login' ;

  }

  getData() {
  }
}
