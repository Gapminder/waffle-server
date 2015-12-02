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
   Home page
  </div>
  <div class="row">
    <div class="col-lg-12">
      <div class="wrapper wrapper-content">
        <div class="middle-box text-center animated fadeInRightBig">
          <h3 class="font-bold">Welcome to Waffle Server</h3>
          <div class="error-desc">
            You can update here any collection document you want. And try other actions:
            get, delete, create.
          </div>
        </div>
      </div>
    </div>
  </div>

`})
export class Home{

  constructor(public router:Router, public http:Http) {
  }

}
