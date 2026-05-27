export interface User {
  uid:            string;
  email:          string;
  display_name?:  string;
  first_name?:    string;
  last_name?:     string;
  photo_url?:     string;
  phone_number?:  string;
  email_verified: boolean;
  disabled:       boolean;
  role?:          string;
  createdAt?:     string;
  updatedAt?:     string;
}
