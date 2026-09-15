FROM php:8.2-apache

# Install MySQL PDO extension
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Enable Apache rewrite module and AllowOverride
RUN a2enmod rewrite && sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Set working directory & copy application code
WORKDIR /var/www/html
COPY . /var/www/html/

# Ensure web server has proper permissions
RUN chown -R www-data:www-data /var/www/html

# Expose standard HTTP port
EXPOSE 80

CMD ["apache2-foreground"]
