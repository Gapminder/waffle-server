import {View, Component} from 'angular2/angular2';
import {Location, RouteConfig, RouterLink, Router} from 'angular2/router';

import {LoggedInRouterOutlet} from './LoggedInOutlet';
import {Home} from '../home/home';
import {Login} from '../login/login';
import {FileUpload} from '../file-upload/file-upload';
import {FileManagement} from '../file-management/file-management';

let template = require('./app.html');


@Component({
  selector: 'auth-app'
})
@View({
  template: template,
  directives: [ LoggedInRouterOutlet ]
})
@RouteConfig([
  { path: '/',       redirectTo: '/home' },
  { path: '/home',   as: 'Home',   component: Home },
  { path: '/login',  as: 'Login',  component: Login },
  { path: '/file-upload',   as: 'FileUpload',   component: FileUpload},
  { path: '/file-management',   as: 'FileManagement',   component: FileManagement}
])
export class App {
  constructor(public router: Router) {
  }
}
