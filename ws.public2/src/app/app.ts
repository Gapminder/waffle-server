import {Component, View, NgIf} from 'angular2/angular2';
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
  directives: [LoggedInRouterOutlet, NgIf],
  styles: [`
    .color-grey {color: #999;}
    .color-grey:hover {color: #333;}
    .avatar {max-width: 70px;}
  `]
})
@RouteConfig([
  {path: '/', redirectTo: '/home'},
  {path: '/home', as: 'Home', component: Home},
  {path: '/login', as: 'Login', component: Login},
  {path: '/file-upload', as: 'FileUpload', component: FileUpload},
  {path: '/file-management', as: 'FileManagement', component: FileManagement}
])
export class App {
  public jwt:string;
  private decodedJwt:any;

  constructor() {
    this.jwt = localStorage.getItem('jwt');
    this.decodedJwt = this.jwt && window.jwt_decode(this.jwt);
  }

  routeLogout() {
    localStorage.removeItem('jwt');
    window.location.href = '/login';
  }
}
