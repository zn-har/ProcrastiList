from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse
import json

@login_required
def index(request):
    return render(request, 'index.html')

@csrf_protect
def login_view(request):
    if request.method == 'POST':
        if request.content_type == 'application/json':
            # Handle AJAX login
            try:
                data = json.loads(request.body)
                email = data.get('email')
                password = data.get('password')
                remember_me = data.get('remember_me', False)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON data'})
        else:
            # Handle form login
            email = request.POST.get('email')
            password = request.POST.get('password')
            remember_me = request.POST.get('remember_me') == 'on'
        
        if email and password:
            # Try to find user by email (Django uses username by default)
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
            
            if user is not None:
                login(request, user)
                
                # Set session expiry based on remember me
                if not remember_me:
                    request.session.set_expiry(0)  # Session expires when browser closes
                else:
                    request.session.set_expiry(1209600)  # 2 weeks
                
                if request.content_type == 'application/json':
                    return JsonResponse({'success': True, 'redirect_url': '/'})
                else:
                    return redirect('index')
            else:
                error_message = 'Invalid email or password'
                if request.content_type == 'application/json':
                    return JsonResponse({'success': False, 'message': error_message})
                else:
                    messages.error(request, error_message)
        else:
            error_message = 'Please fill in all fields'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
    
    return render(request, 'login.html')

@csrf_protect
def register_view(request):
    if request.method == 'POST':
        if request.content_type == 'application/json':
            # Handle AJAX registration
            try:
                data = json.loads(request.body)
                name = data.get('name')
                email = data.get('email')
                password = data.get('password')
                confirm_password = data.get('confirm_password')
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON data'})
        else:
            # Handle form registration
            name = request.POST.get('name')
            email = request.POST.get('email')
            password = request.POST.get('password')
            confirm_password = request.POST.get('confirm_password')
        
        # Validation
        if not all([name, email, password, confirm_password]):
            error_message = 'Please fill in all fields'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'login.html')
        
        if password != confirm_password:
            error_message = 'Passwords do not match'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'login.html')
        
        if User.objects.filter(email=email).exists():
            error_message = 'Email already exists'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'login.html')
        
        if User.objects.filter(username=email).exists():
            error_message = 'User already exists'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
                return render(request, 'login.html')
        
        # Create user
        try:
            user = User.objects.create_user(
                username=email,  # Use email as username
                email=email,
                password=password,
                first_name=name.split()[0] if name.split() else name,
                last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else ''
            )
            
            # Log in the user
            login(request, user)
            
            if request.content_type == 'application/json':
                return JsonResponse({'success': True, 'redirect_url': '/'})
            else:
                messages.success(request, 'Account created successfully!')
                return redirect('index')
                
        except Exception as e:
            error_message = 'Error creating account'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'message': error_message})
            else:
                messages.error(request, error_message)
    
    return render(request, 'login.html')

# Create your views here.
