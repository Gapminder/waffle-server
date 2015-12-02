import {Component, View} from 'angular2/angular2';
import { Router, RouterLink } from 'angular2/router';
import {HTTP_PROVIDERS, Http, Headers} from 'angular2/http';

import {USER_LOGIN_URL} from '../config';

let template = require('./login.html');

@Component({
  selector: 'login',
  providers: [HTTP_PROVIDERS]
})
@View({
  directives: [RouterLink],
  template: template,
  styles: [`
    .loginscreen h1 {font-size: 30px;}
  `]
})
export class Login {
  constructor(public router: Router, public http: Http) {
  }

  login(event, email) {
    event.preventDefault();

    this.http
      .post(USER_LOGIN_URL, JSON.stringify({email}),
        {
          headers: new Headers({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          })
        })
      .map((response:any) => response.json())
      .subscribe(
        (response:any) => {
          localStorage.setItem('jwt', response.id_token);
          window.location.href = '/home' ;
        },
        (error) => {
          alert(error.message);
          console.log(error.message);
        });
  }
}
