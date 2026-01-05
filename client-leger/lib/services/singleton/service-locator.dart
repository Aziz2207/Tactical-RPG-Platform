import 'package:client_leger/services/authentification/auth.dart';
import 'package:client_leger/services/user-account/user-account.dart';
import 'package:client_leger/services/shop/shop_service.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class ServiceLocator {
  static final auth = AuthService();
  static final userAccount = UserAccountService(
    authService: auth,
    httpClient: http.Client(),
    serverBaseUrl: dotenv.env['SERVER_URL']!,
  );

  static final shop = ShopService(
    auth: auth,
    httpClient: http.Client(),
    serverBaseUrl: dotenv.env['SERVER_URL']!,
  );
}
